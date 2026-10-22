// Segunda llamada al modelo, ya con la lectura montada: descarga las webs
// oficiales del catálogo (src/lib/sedes.ts → src/lib/consulta.ts) y pide una
// guía corta de cómo se resuelve el trámite. Una sola llamada, solo texto,
// sin las imágenes del documento. Si algo falla (consulta, modelo, parseo),
// la Lectura se devuelve igual que ahora: la guía es un extra, nunca un 502.
import { completar, type Mensaje } from "./ia";
import { descargar, type Descarga } from "./consulta";
import type { Guia, Lectura } from "./lectura";
import { elegirEnlaces } from "./sedes";

export const SYSTEM_PROMPT_GUIA = `Eres quien le explica a un vecino, en corto, cómo se resuelve el trámite de una carta oficial. Te paso lo que ya sabemos del documento (la lectura) y el texto de las webs oficiales que hemos podido abrir ahora mismo. Tu salida es SOLO un objeto JSON válido, sin markdown ni explicaciones.

- Habla de tú, con frases cortas y tono cercano, como se lo contarías a un vecino.
- Sin jerga: si un término oficial es inevitable, dilo y tradúcelo en la misma frase (p. ej. «subsanar, o sea, completar lo que falta»).
- Escribe en el idioma que te indico en el mensaje (castellano, catalán, valenciano, euskera, gallego o aranés).
- texto: máximo 4 frases. pasos: 1 a 4 pasos como strings, cada paso una sola
  línea y accionable (entra en la sede, paga, presenta…); deja la lista vacía
  solo si de verdad no hay acción posible.
- Solo afirma lo que esté en el texto de las webs descargadas o en la lectura. No inventes importes, plazos ni requisitos.
- Si la web y la ley no coinciden, manda la ley y dilo en una frase. Caso conocido: la web de la DGT dice 10 días para identificar al conductor, pero el RDL 6/2015 art. 93.1 dice 20 días naturales; usa el plazo que diga la notificación y, si no consta, 20 días naturales.
- Si el plazo ya venció, no hagas cuenta atrás: di qué opciones quedan.
- No pongas enlaces, direcciones web ni teléfonos dentro del texto ni de los pasos, salvo que estén en las webs descargadas o en la lectura: los enlaces los añade el sistema aparte.

Devuelve SOLO: {"texto": "...", "pasos": ["...", ...]}`;

function promptUsuarioGuia(
  lectura: Lectura,
  leidas: Descarga[],
  lengua?: string,
): string {
  const conocidos = {
    emisor: lectura.emisor,
    tipoActo: lectura.tipoActo,
    queDice: lectura.queDice,
    queHacer: lectura.queHacer.map((q) => q.texto),
    plazo: {
      regla: lectura.plazo.regla,
      fraseOriginal: lectura.plazo.fraseOriginal,
      fechaLimite: lectura.plazo.fechaLimite,
      vencido: lectura.plazo.vencido,
    },
    siYaVencio: lectura.siYaVencio,
    sede: lectura.sede,
  };
  const webs = leidas
    .map((d, i) => `[${i + 1}] ${d.nombre} — ${d.url}\n${d.texto}`)
    .join("\n\n");
  // La lengua que eligió la persona; si no eligió, la del documento.
  const idioma =
    lengua ?? (lectura.idioma === "va" ? "valenciano" : "castellano");
  return `Idioma en el que debes escribir: ${idioma}.

LO QUE YA SABEMOS DEL DOCUMENTO:
${JSON.stringify(conocidos)}

WEBS OFICIALES DESCARGADAS AHORA MISMO (texto visible recortado):
${webs}

Devuelve solo el JSON {"texto", "pasos"}.`;
}

function objetoDe(respuesta: string): string | null {
  const inicio = respuesta.indexOf("{");
  const fin = respuesta.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) return null;
  return respuesta.slice(inicio, fin + 1);
}

export function parsearGuia(respuesta: string): { texto: string; pasos: string[] } | null {
  const crudo = objetoDe(respuesta);
  if (!crudo) return null;
  let dato: unknown;
  try {
    dato = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (typeof dato !== "object" || dato === null) return null;
  const d = dato as Record<string, unknown>;
  if (typeof d.texto !== "string" || !d.texto.trim()) return null;
  // El modelo a veces trae cada paso como objeto ("paso", "texto"…) en vez de
  // como string: se acepta el primer campo de texto útil y se descarta lo demás.
  const CLAVES_PASO = ["paso", "texto", "descripcion", "accion", "titulo"];
  const pasoDe = (v: unknown): string | null => {
    if (typeof v === "string") return v.trim() || null;
    if (typeof v !== "object" || v === null) return null;
    const o = v as Record<string, unknown>;
    for (const k of CLAVES_PASO)
      if (typeof o[k] === "string" && (o[k] as string).trim())
        return (o[k] as string).trim();
    return null;
  };
  const pasos = Array.isArray(d.pasos)
    ? d.pasos
        .map(pasoDe)
        .filter((p): p is string => p !== null)
        .slice(0, 4)
    : [];
  return { texto: d.texto.trim().slice(0, 700), pasos };
}

// Monta la guía (o null si no toca: emisor fuera del catálogo o todo fallido).
async function prepararGuia(
  lectura: Lectura,
  lengua?: string,
): Promise<Guia | null> {
  const enlaces = elegirEnlaces(lectura);
  if (enlaces.length === 0) return null;

  const descargas = await descargar(enlaces);
  const enlacesIntentados = descargas.map(({ nombre, url, leida }) => ({ nombre, url, leida }));
  const leidas = descargas.filter((d) => d.leida && d.texto);

  // Ni una página leída: una sola frase que manda al enlace y pasos vacíos,
  // sin llamar al modelo (nada que explicar que no venga de las webs).
  if (leidas.length === 0) {
    return {
      texto: `No he podido consultar ahora mismo las webs oficiales: lo tienes en ${enlacesIntentados[0].nombre}.`,
      pasos: [],
      enlaces: enlacesIntentados,
    };
  }

  try {
    const mensajes: Mensaje[] = [
      { role: "system", content: SYSTEM_PROMPT_GUIA },
      { role: "user", content: promptUsuarioGuia(lectura, leidas, lengua) },
    ];
    const cruda = parsearGuia(await completar(mensajes));
    if (!cruda) return null;
    return { texto: cruda.texto, pasos: cruda.pasos, enlaces: enlacesIntentados };
  } catch {
    return null;
  }
}

// Devuelve la Lectura con guia y con los enlaces de la guía sumados a fuentes
// (sin duplicar url) para que <Fuentes /> los pinte. Si la consulta falla
// entera, la Lectura queda exactamente igual que ahora.
export async function lecturaConGuia(
  lectura: Lectura,
  lengua?: string,
): Promise<Lectura> {
  try {
    const guia = await prepararGuia(lectura, lengua);
    if (!guia) return lectura;
    const vistas = new Set(lectura.fuentes.map((f) => f.url));
    const extra = guia.enlaces
      .filter((e) => !vistas.has(e.url))
      .map(({ nombre, url }) => ({ nombre, url }));
    return { ...lectura, guia, fuentes: [...lectura.fuentes, ...extra] };
  } catch {
    return lectura;
  }
}
