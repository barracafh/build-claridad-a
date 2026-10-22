import type { Source } from "@/components/Fuentes";
import type { Guia, Lectura } from "./lectura";
import ficha from "../../ficha.json";
import { esUrlPermitida } from "./sedes";

// Contrato entre la API y la pantalla. Versión reducida del esquema de
// contexto.md, apartado 6.1: solo lo que la persona ve.

// Apartado 4.1, por orden de gravedad.
export type Categoria =
  | "PIERDE_DERECHO"
  | "SANCION"
  | "PAGAR"
  | "HACER"
  | "ACTUAR_SI_QUIERES"
  | "INFORMA";

export type EstadoCalculo =
  | "CALCULADA"
  | "FALTA_FECHA_NOTIFICACION"
  | "PLAZO_NO_IDENTIFICADO"
  | "FUERA_DE_ALCANCE";

export type Resultado = {
  emisor: string; // literal del membrete
  tipoActo: string; // título del documento, en claro
  titular: string; // una frase: de qué va la carta
  queDice: string; // ≤ 3 frases, sin jerga
  categoria: Categoria;
  pasos: string[];
  consecuencia: { claro: string; literal: string | null };
  donde: { texto: string; sede: Source | null };
  plazo: {
    textoLiteral: string | null; // la frase de la carta de la que sale el plazo
    regla: string; // «10 días hábiles · Ley 39/2015, art. 30»
    fechaNotificacion: string | null; // AAAA-MM-DD
    fechaLimite: string | null; // AAAA-MM-DD, la calcula el código, no la IA
    estadoCalculo: EstadoCalculo;
  };
  siYaVencio: string; // qué queda por hacer si el plazo ya pasó
  confianza: "ALTA" | "MEDIA" | "BAJA";
  guia?: Guia; // guía corta con webs oficiales; falta si la consulta falló
  fuentes: Source[];
};

export const textoCategoria: Record<Categoria, string> = {
  PIERDE_DERECHO: "Si no haces nada, pierdes un derecho",
  SANCION: "Te sancionan o te abren un expediente",
  PAGAR: "Tienes que pagar",
  HACER: "Tienes que hacer algo",
  ACTUAR_SI_QUIERES: "Puedes responder si no estás de acuerdo",
  INFORMA: "Solo te informa",
};

const aFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};

// «viernes 23 de octubre»
export const fechaLarga = (iso: string) =>
  aFecha(iso)
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(",", "");

export type EstadoPlazo =
  { tipo: "en-plazo"; dias: number } | { tipo: "hoy" } | { tipo: "vencido" };

export function estadoPlazo(
  fechaLimite: string,
  hoy = new Date(),
): EstadoPlazo {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round(
    (aFecha(fechaLimite).getTime() - inicio.getTime()) / 86_400_000,
  );
  if (dias < 0) return { tipo: "vencido" };
  if (dias === 0) return { tipo: "hoy" };
  return { tipo: "en-plazo", dias };
}

// De lo que devuelve POST /api/documento (src/lib/lectura.ts) a lo que pinta
// esta pantalla. Sin inventar datos: lo que no venga, con el texto genérico.
export function deLectura(l: Lectura): Resultado {
  // El titular, en lenguaje llano: la primera frase de la explicación. El
  // nombre técnico del documento («Requerimiento de subsanación») va aparte.
  // La guía (si vino) está escrita en lenguaje más llano: manda en el
  // titular, y sus pasos y enlaces cubren lo que falte en la lectura.
  const titular =
    primeraFrase(l.guia?.texto ?? l.queDice) || l.tipoActo || "Tu carta";
  const pasos =
    l.queHacer.length > 0
      ? l.queHacer.map((q) => q.texto)
      : (l.guia?.pasos ?? []);
  // Las URLs las propone el modelo: solo se enlazan las de dominios oficiales
  // del catálogo (src/lib/sedes.ts), para que una carta manipulada no cuele
  // un enlace de phishing con un nombre de confianza.
  const enlaceGuia = l.guia?.enlaces.find(
    (e) => e.leida && esUrlPermitida(e.url),
  );
  const sede =
    l.sede && esUrlPermitida(l.sede.url)
      ? l.sede
      : enlaceGuia
        ? { nombre: enlaceGuia.nombre, url: enlaceGuia.url }
        : null;
  const fuentes = l.fuentes.filter((f) => esUrlPermitida(f.url));
  return {
    emisor: l.emisor ?? "Documento oficial",
    tipoActo: l.tipoActo ?? titular,
    titular,
    queDice: l.queDice,
    categoria: l.categoria ?? "HACER",
    pasos,
    consecuencia: { claro: l.siNoHacesNada, literal: null },
    donde: sede
      ? {
          texto: `Puedes confirmarlo en la web oficial: ${sede.nombre}.`,
          sede,
        }
      : {
          texto:
            "Confírmalo en la web o en la sede del organismo que te escribe.",
          sede: null,
        },
    plazo: {
      textoLiteral: l.plazo.fraseOriginal,
      regla: l.plazo.regla ?? "Plazo no identificado",
      fechaNotificacion: l.plazo.fechaNotificacion,
      fechaLimite: l.plazo.fechaLimite,
      estadoCalculo: l.plazo.estado,
    },
    siYaVencio:
      l.siYaVencio ??
      "Aun así, suele poder presentarse la documentación o el pago fuera de plazo; consulta al organismo qué opciones quedan.",
    confianza: l.confianza ?? "MEDIA",
    // Guía opcional: se copia tal cual si vino.
    ...(l.guia ? { guia: l.guia } : {}),
    // Regla 1 de la plataforma: toda respuesta cita una fuente oficial. Si el
    // modelo no devuelve ninguna, se cita la norma de cómputo de plazos.
    fuentes: fuentes.length > 0 ? fuentes : ficha.fuentes,
  };
}

function primeraFrase(texto: string): string {
  const frase = texto.split(/(?<=[.!?…])\s/)[0] ?? texto;
  return frase.length > 90 ? `${frase.slice(0, 87).trimEnd()}…` : frase;
}
