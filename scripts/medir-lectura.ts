// Mide el camino de lectura (rasterizado mupdf + llamada a HelmCode) sobre UN
// documento de datos/documentos/. Solo imprime tiempos, tamaños y la fecha
// límite calculada comparada con indice.json: nunca el contenido del documento.
// Uso:
//   bun scripts/medir-lectura.ts datos/documentos/01-aeat-requerimiento-irpf.pdf
//   bun scripts/medir-lectura.ts <archivo> --sin-modelo  (solo rasterizado)
//   bun scripts/medir-lectura.ts <archivo> --con-imagenes  (fuerza las imágenes)
import { readFileSync } from "node:fs";
import indice from "../datos/documentos/indice.json";
import { validarEntrada } from "../src/lib/entrada";
import { procesarPdf } from "../src/lib/pdf";
import { completar, type Mensaje } from "../src/lib/ia";
import {
  montarLectura,
  parsearExtraccion,
  promptUsuario,
  SYSTEM_PROMPT,
} from "../src/lib/extraccion";

const args = process.argv.slice(2);
const rutaArchivo = args.find((a) => !a.startsWith("--"));
const sinModelo = args.includes("--sin-modelo");
const conImagenesForzado = args.includes("--con-imagenes");
if (!rutaArchivo) {
  console.error(
    "Uso: bun scripts/medir-lectura.ts <archivo.pdf|jpg|png> [--sin-modelo] [--solo-texto]",
  );
  process.exit(1);
}

const bytes = new Uint8Array(readFileSync(rutaArchivo));
const t0 = performance.now();

const entrada = validarEntrada(bytes, null);
if ("codigo" in entrada) {
  console.error(`Entrada rechazada (${entrada.codigo}).`);
  process.exit(1);
}

let imagenes: string[] = [];
let texto = "";
if (entrada.tipo === "pdf") {
  const pdf = procesarPdf(bytes);
  if (!pdf.ok) {
    console.error(`PDF rechazado (${pdf.codigo}).`);
    process.exit(1);
  }
  texto = pdf.texto;
  // Igual que la ruta: con capa de texto de verdad no se envían imágenes.
  // MINIMO_TEXTO_UTIL está en src/app/api/documento/route.ts.
  imagenes =
    !conImagenesForzado && texto.replace(/\s/g, "").length >= 200
      ? []
      : pdf.hojas.map((h) => h.dataUrl);
} else {
  imagenes = [
    `data:image/${entrada.tipo === "png" ? "png" : "jpeg"};base64,${Buffer.from(bytes).toString("base64")}`,
  ];
}
const msRaster = Math.round(performance.now() - t0);
const kbImagenes = Math.round(
  imagenes.reduce((n, d) => n + d.length, 0) / 1024,
);
console.log(
  `raster: ${msRaster} ms · imágenes: ${imagenes.length} (${kbImagenes} KB base64) · capa de texto: ${texto.length} caracteres${imagenes.length === 0 ? " (solo texto)" : ""}`,
);
if (sinModelo) process.exit(0);

const t1 = performance.now();
const mensajes: Mensaje[] = [
  { role: "system", content: SYSTEM_PROMPT },
  {
    role: "user",
    content: [
      ...imagenes.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })),
      { type: "text" as const, text: promptUsuario(texto) },
    ],
  },
];
let cruda: string;
try {
  cruda = await completar(mensajes);
} catch (e) {
  console.error(`HelmCode falló: ${(e as Error).message}`);
  process.exit(1);
}
const msModelo = Math.round(performance.now() - t1);

const extraccion = parsearExtraccion(cruda);
if (!extraccion) {
  console.error("El JSON del modelo no ha parseado.");
  process.exit(1);
}
const lectura = montarLectura(extraccion);

console.log(
  `modelo: ${msModelo} ms · total: ${Math.round(performance.now() - t0)} ms`,
);
const esperado = indice.find((d) => d.archivo === rutaArchivo.split("/").pop());
const fechaObtenida = lectura.plazo.fechaLimite;
if (esperado) {
  const fechaEsperada = esperado.fecha_limite_esperada.slice(0, 10);
  const ok = fechaObtenida === fechaEsperada;
  console.log(
    `fecha esperada: ${fechaEsperada} · obtenida: ${fechaObtenida ?? "null"} · ${ok ? "FECHA OK" : "FECHA FALLA"}`,
  );
  process.exit(ok ? 0 : 2);
}
console.log(`fecha obtenida: ${fechaObtenida ?? "null"} (sin entrada en indice.json)`);
