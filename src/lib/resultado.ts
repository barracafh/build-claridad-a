import type { Source } from "@/components/Fuentes";

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
