// POST multipart con el campo "documento" (PDF, JPG o PNG). Devuelve un
// `Lectura` (src/lib/lectura.ts). Todo en memoria: el archivo ni su texto
// tocan disco, base de datos ni logs.
import { MAX_BYTES_BODY, MAX_BYTES_IMAGEN, validarEntrada } from "../../../lib/entrada";
import {
  aplicarFechaUsuario,
  montarLectura,
  parsearExtraccion,
  promptUsuario,
  SYSTEM_PROMPT,
} from "../../../lib/extraccion";
import { lecturaConGuia } from "../../../lib/guia";
import { completar, type Mensaje } from "../../../lib/ia";
import { procesarPdf } from "../../../lib/pdf";

export const runtime = "nodejs";

// Por debajo de estos caracteres sin espacios la capa de texto es un
// escaneo: entonces toca leer de las imágenes.
const MINIMO_TEXTO_UTIL = 200;

export async function POST(req: Request) {
  const inicio = performance.now();
  const longitud = Number(req.headers.get("content-length"));
  if (Number.isFinite(longitud) && longitud > MAX_BYTES_BODY)
    return respuestaError(
      400,
      "El archivo es demasiado grande (máximo 4 MB). Baja su tamaño y vuelve a intentarlo.",
      "tamano",
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return respuestaError(
      400,
      "No se ha recibido el archivo correctamente. Sube un PDF o una foto en JPG o PNG.",
      "formato",
    );
  }
  const archivo =
    form.get("documento") ??
    [...form.values()].find((v) => v instanceof File);
  if (!(archivo instanceof File))
    return respuestaError(
      400,
      "Falta el archivo. Sube un PDF o una foto en JPG o PNG.",
      "formato",
    );

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const entrada = validarEntrada(bytes, archivo.type);
  if ("codigo" in entrada) return respuestaError(400, entrada.error, entrada.codigo);

  let imagenes: string[];
  let texto: string;
  if (entrada.tipo === "pdf") {
    const pdf = procesarPdf(bytes);
    if (!pdf.ok)
      return pdf.codigo === "paginas"
        ? respuestaError(
            400,
            "El PDF tiene más de 8 páginas. Envía solo las hojas de la notificación.",
            "paginas",
          )
        : respuestaError(
            400,
            "No se ha podido leer el PDF. Comprueba que el archivo no esté dañado.",
            "formato",
          );
    texto = pdf.texto;
    // Si la capa de texto tiene contenido de verdad, sobra la visión: el
    // modelo lee el texto, que pesa mucho menos que las imágenes. Si es un
    // escaneo (texto casi vacío), se mandan las hojas como ahora.
    imagenes =
      texto.replace(/\s/g, "").length >= MINIMO_TEXTO_UTIL
        ? []
        : pdf.hojas.map((h) => h.dataUrl);
  } else {
    imagenes = [
      `data:image/${entrada.tipo === "png" ? "png" : "jpeg"};base64,${Buffer.from(bytes).toString("base64")}`,
    ];
    texto = "";
  }
  const msRaster = Math.round(performance.now() - inicio);

  const mensajes: Mensaje[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        ...imagenes.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        { type: "text" as const, text: promptUsuario(texto, imagenes.length > 0) },
      ],
    },
  ];

  let cruda: string;
  const antesModelo = performance.now();
  try {
    cruda = await completar(mensajes);
  } catch {
    return respuestaError(
      502,
      "No se ha podido leer el documento ahora mismo. Prueba otra vez en unos segundos.",
      "lectura",
    );
  }
  const msModelo = Math.round(performance.now() - antesModelo);
  const extraccion = parsearExtraccion(cruda);
  if (!extraccion)
    return respuestaError(
      502,
      "No se ha podido leer el documento ahora mismo. Prueba otra vez en unos segundos.",
      "lectura",
    );
  aplicarFechaUsuario(extraccion, textoFormulario(form.get("fecha")));
  const lecturaBase = montarLectura(extraccion);
  // La guía (webs oficiales + segunda llamada al modelo) es un extra: si
  // falla, lecturaConGuia devuelve la Lectura tal cual, sin convertirlo en
  // un error: la lectura del documento ya es válida.
  return Response.json(await lecturaConGuia(lecturaBase), {
    headers: cabeceraTiempos(inicio, msRaster, msModelo),
  });
}

// FormData también acepta strings; aquí solo nos vale el campo "fecha".
function textoFormulario(valor: FormDataEntryValue | null): string | null {
  return typeof valor === "string" ? valor : null;
}

function respuestaError(status: number, error: string, codigo: string) {
  return Response.json({ error, codigo }, { status });
}

// Milisegundos de rasterizado, de la llamada al modelo y del total, en una
// cabecera fuera del JSON de Lectura. Solo cifras: jamás contenido del archivo.
function cabeceraTiempos(inicio: number, msRaster: number, msModelo: number) {
  const msTotal = Math.round(performance.now() - inicio);
  return {
    "x-tiempos-lectura": `raster=${msRaster};modelo=${msModelo};total=${msTotal}`,
  };
}
