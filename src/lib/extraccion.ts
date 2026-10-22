// Prompt al modelo, parseo de su JSON y montaje del `Lectura` que consume el
// front. El modelo solo extrae hechos: la fecha límite la calcula el servidor
// en src/lib/plazos.ts. Nada del documento se registra.
import {
  AVISO_FIJO,
  type Categoria,
  type EstadoCalculo,
  type ExtraccionModelo,
  type Lectura,
} from "./lectura";
import { calcularFechaLimite, estaVencido, HOY } from "./plazos";

const UNIDADES = ["DIAS_HABILES", "DIAS_NATURALES", "MESES", "FECHA_FIJA"] as const;
const CATEGORIAS = [
  "PIERDE_DERECHO",
  "SANCION",
  "PAGAR",
  "HACER",
  "ACTUAR_SI_QUIERES",
  "INFORMA",
] as const;
const CONFIANZAS = ["ALTA", "MEDIA", "BAJA"] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\//i;

export const SYSTEM_PROMPT = `Eres un lector de documentos administrativos españoles (notificaciones, requerimientos, resoluciones) para una herramienta ciudadana. Recibes las hojas del documento como imágenes y, si existe, su capa de texto. Tu salida es SOLO un objeto JSON válido, sin markdown, sin explicaciones ni campos extra.

Responde en el idioma del documento (puede estar en castellano o en valenciano), salvo que el usuario pida otro.

Lenguaje llano, sin jerga administrativa, para alguien que lo ve por primera vez. Cuatro cosas:
- quéDice: qué dice el documento, en pocas frases.
- queHacer: qué hay que hacer, como checklist con frases cortas y accionables.
- siNoHacesNada: qué pasa si no se hace nada en plazo (efecto que prevé el propio documento).
- plazo: para cuándo.

Reglas estrictas:
- No uses ningún dato que no esté en el documento o en el contexto que te pasamos. Si no ves el plazo, la fecha de notificación o la regla, devuelve null en ese campo y dilo en quéDice. Nunca inventes importes, plazos ni requisitos.
- emisor: el organismo que firma el documento, tal como aparece en el membrete o la firma; null si no se ve claro.
- tipoActo: qué es el documento en claro y corto (máx. 8 palabras), por ejemplo «Requerimiento de documentación» o «Notificación de denuncia de tráfico».
- categoria: qué le pasa a la persona si no actúa. Solo UNA, la más grave que aplique, en este orden: PIERDE_DERECHO (pierde una prestación o un derecho: desistimiento, caducidad, baja de oficio), SANCION (multa o expediente sancionador), PAGAR (te piden ingresar dinero), HACER (te piden un trámite: aportar, subsanar, comparecer, identificarte), ACTUAR_SI_QUIERES (puedes alegar o recurrir si no estás de acuerdo, sin obligación), INFORMA (solo te informa).
- idioma: código ISO 639-1 del idioma en que está ESCRITO el documento («es», «va»…), no el idioma de tu respuesta.
- queHacer: 1 a 6 pasos concretos (qué presentar, dónde y cómo: sede electrónica, registro, DEHú…). Si el documento no pide trámite alguno, lista vacía.
- plazo.fraseOriginal: cita la frase original de la que sale el plazo, tal como aparece en el documento.
- plazo.regla: la regla de cómputo en una línea, por ejemplo «10 días hábiles, Ley 39/2015 art. 30» o «20 días naturales, RDL 6/2015 art. 93.1».
- plazo.cantidad y plazo.unidad: el número y su unidad. Unidad DIAS_HABILES (días hábiles), DIAS_NATURALES (días naturales), MESES (meses) o FECHA_FIJA (el documento da una fecha concreta).
- plazo.fechaNotificacion: fecha de notificación en formato AAAA-MM-DD, extraída del documento; null si no consta.
- plazo.fechaLiteral: solo si el documento fija la fecha límite concreta (por ejemplo «hasta el día 20 de este mismo mes»), en AAAA-MM-DD; si no, null.
- plazo.electoral: true solo si es un documento electoral (por ejemplo, designación de miembro de mesa, LOREG art. 119): esos plazos son naturales e improrrogables.
- NO calcules la fecha límite: la calcula el servidor a partir de los campos de plazo. Tú solo extraes los hechos. En queDice y siNoHacesNada no afirmes fechas de vencimiento: si el plazo ya venció, di «el plazo ya venció» y qué opciones quedan; la fecha concreta la aporta el servidor.
- Códec de referencia para redactar (no para calcular): días hábiles excluyen sábados, domingos y festivos de 2026 en València (entre octubre y noviembre solo festivos el 9/10 y el 12/10); plazos en meses vencen el mismo día del mes siguiente y, si cae en inhábil, al siguiente hábil; plazos electorales siempre naturales e improrrogables (LOREG art. 119).
- Hoy es ${HOY}. Si el plazo ya venció, dilo («el plazo ya venció») y explica qué opciones quedan según el propio documento; sin cuenta atrás negativa.
- siYaVencio: si el plazo ya venció, qué opciones quedan según el propio documento (presentar igualmente, pago fuera de plazo con recargo, recurso si aún procede…). Si el plazo no ha vencido o no consta, null.
- sede: nombre y página web concreta (https) del órgano emisor donde confirmar el plazo; null si no la puedes precisar.
- fuentes: 1 a 3 enlaces https a páginas oficiales y concretas que sostienen la respuesta (BOE, norma citada, sede del órgano). Si el documento cita la Ley 39/2015, el LOREG u otra norma cuyo enlace te doy en el contexto, incluye ese enlace. Nada de páginas genéricas.
- confianza: ALTA si el plazo y la fecha de notificación se leen claros en el texto; MEDIA si los dedujiste del contexto; BAJA si tienes dudas.
- En aviso no hace falta que escribas nada: lo añade el sistema.

Contexto legal de referencia, por si el documento lo cita: cómputo de plazos Ley 39/2015 art. 30 (https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565); plazos electorales LOREG art. 119 (https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672); tráfico RDL 6/2015 arts. 93 y 94.`;

export function promptUsuario(texto: string, lengua?: string): string {
  const parte =
    texto.trim().length > 0
      ? `Capa de texto extraída del documento (si discrepan texto e imágenes, manda las imágenes):\n<<<\n${texto.trim().slice(0, 20000)}\n>>>`
      : "No hay capa de texto extraída: léelo de las imágenes.";
  // La lengua que eligió la persona en la pantalla, si eligió una.
  const enLengua = lengua
    ? `\n\nLa persona ha pedido la respuesta en ${lengua}: escribe en ${lengua} todos los textos para ella (queDice, queHacer, siNoHacesNada, siYaVencio). fraseOriginal sigue siendo la cita literal del documento, sin traducir.`
    : "";
  return `${parte}${enLengua}\n\nDevuelve solo el objeto JSON con el esquema acordado.`;
}

export function parsearExtraccion(respuesta: string): ExtraccionModelo | null {
  const crudo = extraerObjeto(respuesta);
  if (!crudo) return null;
  let dato: unknown;
  try {
    dato = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (typeof dato !== "object" || dato === null) return null;
  const d = dato as Record<string, unknown>;

  if (typeof d.queDice !== "string" || !d.queDice.trim()) return null;
  if (typeof d.siNoHacesNada !== "string" || !d.siNoHacesNada.trim()) return null;
  const queHacer = Array.isArray(d.queHacer)
    ? d.queHacer
        .filter(
          (q): q is { texto: string } =>
            typeof q === "object" &&
            q !== null &&
            typeof (q as { texto: unknown }).texto === "string" &&
            (q as { texto: string }).texto.trim().length > 0,
        )
        .slice(0, 12)
    : [];
  const p = (typeof d.plazo === "object" && d.plazo !== null ? d.plazo : {}) as Record<string, unknown>;
  const textoONull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const fechaONull = (v: unknown): string | null =>
    typeof v === "string" && ISO.test(v) ? v : null;

  const sede = esEnlace(d.sede);
  const fuentes = Array.isArray(d.fuentes)
    ? d.fuentes.flatMap((f) => {
        const e = esEnlace(f);
        return e ? [e] : [];
      }).slice(0, 5)
    : [];

  return {
    emisor: textoONull(d.emisor)?.slice(0, 200) ?? null,
    tipoActo: textoONull(d.tipoActo)?.slice(0, 80) ?? null,
    categoria: CATEGORIAS.find((c) => c === d.categoria) ?? null,
    queDice: d.queDice.trim(),
    queHacer,
    plazo: {
      fraseOriginal: textoONull(p.fraseOriginal),
      regla: textoONull(p.regla),
      cantidad: typeof p.cantidad === "number" && Number.isFinite(p.cantidad) ? p.cantidad : null,
      unidad: UNIDADES.find((u) => u === p.unidad) ?? null,
      fechaNotificacion: fechaONull(p.fechaNotificacion),
      fechaLiteral: fechaONull(p.fechaLiteral),
      electoral: p.electoral === true,
    },
    siNoHacesNada: d.siNoHacesNada.trim(),
    siYaVencio: textoONull(d.siYaVencio),
    sede,
    fuentes,
    idioma: textoONull(d.idioma)?.slice(0, 12) ?? "es",
    confianza: CONFIANZAS.find((c) => c === d.confianza) ?? null,
  };
}

function esEnlace(v: unknown): { nombre: string; url: string } | null {
  if (typeof v !== "object" || v === null) return null;
  const e = v as Record<string, unknown>;
  if (typeof e.nombre !== "string" || !e.nombre.trim()) return null;
  if (typeof e.url !== "string" || !HTTPS.test(e.url)) return null;
  return { nombre: e.nombre.trim().slice(0, 200), url: e.url.trim() };
}

// Si el modelo devuelve el JSON rodeado de texto o de cercas de código, nos
// quedamos con el objeto.
function extraerObjeto(respuesta: string): string | null {
  const inicio = respuesta.indexOf("{");
  const fin = respuesta.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) return null;
  return respuesta.slice(inicio, fin + 1);
}

export function montarLectura(ex: ExtraccionModelo): Lectura {
  const fechaLimite = calcularFechaLimite(ex.plazo);
  return {
    emisor: ex.emisor,
    tipoActo: ex.tipoActo,
    categoria: ex.categoria,
    queDice: ex.queDice,
    queHacer: ex.queHacer,
    plazo: {
      estado: estadoDelPlazo(ex.plazo, fechaLimite),
      fechaNotificacion: ex.plazo.fechaNotificacion,
      fechaLimite,
      vencido: estaVencido(fechaLimite),
      fraseOriginal: ex.plazo.fraseOriginal,
      regla: ex.plazo.regla,
    },
    siNoHacesNada: ex.siNoHacesNada,
    siYaVencio: ex.siYaVencio,
    sede: ex.sede,
    fuentes: ex.fuentes,
    aviso: AVISO_FIJO,
    idioma: ex.idioma,
    confianza: ex.confianza,
  };
}

// Con regla y cantidad pero sin fecha de notificación no hay cálculo posible:
// el front preguntará el día de la carta (contexto.md 6.2.2).
function estadoDelPlazo(
  p: ExtraccionModelo["plazo"],
  fechaLimite: string | null,
): EstadoCalculo {
  if (fechaLimite) return "CALCULADA";
  const faltaFecha =
    !!p.regla &&
    p.unidad != null &&
    p.unidad !== "FECHA_FIJA" &&
    typeof p.cantidad === "number" &&
    !p.fechaNotificacion;
  return faltaFecha ? "FALTA_FECHA_NOTIFICACION" : "PLAZO_NO_IDENTIFICADO";
}

// La fecha que escribe la persona en la pantalla «¿Qué día te llegó la
// carta?» rellena el hueco del modelo. Nunca sobrescribe una fecha extraída.
export function aplicarFechaUsuario(
  ex: ExtraccionModelo,
  fecha: string | null | undefined,
): void {
  if (!fecha || !ISO.test(fecha) || ex.plazo.fechaNotificacion) return;
  ex.plazo.fechaNotificacion = fecha;
}
