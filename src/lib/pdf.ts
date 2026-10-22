// Rasteriza el PDF a JPEG dentro de los límites de visión de la familia GLM
// y extrae su capa de texto. Todo en memoria con mupdf (WASM): sin disco.
import * as mupdf from "mupdf";
import { MAX_BYTES_IMAGEN, MAX_PAGINAS, MAX_PX } from "./entrada";

const LADO_LARGO_OBJETIVO = 1600;
const CALIDADES = [0.85, 0.7, 0.55, 0.4];

export type Hoja = { dataUrl: string; bytes: number };

export type PdfOk = { ok: true; hojas: Hoja[]; texto: string };
export type PdfMal = { ok: false; codigo: "paginas" | "formato" };

export function procesarPdf(bytes: Uint8Array): PdfOk | PdfMal {
  let doc: mupdf.Document;
  try {
    doc = mupdf.Document.openDocument(bytes, "application/pdf");
  } catch {
    return {
      ok: false,
      codigo: "formato",
    };
  }
  const paginas = doc.countPages();
  if (paginas > MAX_PAGINAS)
    return { ok: false, codigo: "paginas" };

  const hojas: Hoja[] = [];
  const textos: string[] = [];
  for (let i = 0; i < paginas; i++) {
    const page = doc.loadPage(i);
    const [x0, y0, x1, y1] = page.getBounds();
    const ancho = x1 - x0;
    const alto = y1 - y0;
    const lado = Math.max(ancho, alto);
    const hoja = rasterizarHoja(page, lado > 0 ? LADO_LARGO_OBJETIVO / lado : 1);
    if (!hoja) {
      page.destroy();
      return { ok: false, codigo: "formato" };
    }
    hojas.push(hoja);
    const stext = page.toStructuredText({});
    textos.push(stext.asText());
    stext.destroy();
    page.destroy();
  }
  return { ok: true, hojas, texto: textos.join("\n\n") };
}

function rasterizarHoja(page: mupdf.Page, escala: number): Hoja | null {
  for (const factor of [1, 0.7]) {
    const e = escala * factor;
    if (Math.max(page.getBounds()[2], page.getBounds()[3]) * e > MAX_PX) continue;
    const pix = page.toPixmap(
      mupdf.Matrix.scale(e, e),
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    for (const calidad of CALIDADES) {
      const jpeg = pix.asJPEG(calidad);
      if (jpeg.length < MAX_BYTES_IMAGEN) {
        pix.destroy();
        return {
          dataUrl: `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`,
          bytes: jpeg.length,
        };
      }
    }
    pix.destroy();
  }
  return null;
}
