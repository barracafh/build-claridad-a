// Prueba de descarga y paso a texto. Se ejecuta con `bun src/lib/consulta.prueba.ts`:
// 0 si todo va bien. Todo con un fetch falso y HTML en memoria: sin red. La única
// prueba real contra una URL del catálogo se lanzó a mano al integrar (ver chat).
import { descargar, htmlATexto } from "./consulta";

let fallos = 0;
function comprobar(cond: boolean, titulo: string): void {
  if (cond) {
    console.log(`  ✓ ${titulo}`);
  } else {
    fallos++;
    console.error(`  ✗ ${titulo}`);
  }
}

const ENLACE = { nombre: "BOE, Ley 39/2015", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565" };

const conFetchFalso = async (
  falso: (url: string) => Response | Promise<Response>,
  cuerpo: () => Promise<void>,
): Promise<void> => {
  const original = globalThis.fetch;
  globalThis.fetch = falso as typeof fetch;
  try {
    await cuerpo();
  } finally {
    globalThis.fetch = original;
  }
};

const respuesta = (opciones: {
  status?: number;
  tipo?: string;
  cuerpo?: string;
  location?: string;
}): Response =>
  new Response(opciones.cuerpo ?? "", {
    status: opciones.status ?? 200,
    headers: {
      "content-type": opciones.tipo ?? "text/html; charset=utf-8",
      ...(opciones.location ? { location: opciones.location } : {}),
    },
  });

const HTML =
  `<html><head><title>Politulo</title><style>.a{color:red}</style>` +
  `<script>console.log("no debe salir")</script></head>` +
  `<body><h1>Ley 39/2015</h1><!-- comentario -->` +
  `<p>Los plazos se cuentan en días hábiles. &iexcl;Atenci&oacute;n!</p>` +
  `<noscript>ni esto</noscript></body></html>`;

console.log("htmlATexto");
const texto = htmlATexto(HTML);
comprobar(texto.includes("Ley 39/2015"), "conserva el texto visible");
comprobar(!texto.includes("no debe salir"), "quita el script");
comprobar(!texto.includes("color:red"), "quita el style");
comprobar(!texto.includes("ni esto"), "quita el noscript");
comprobar(!texto.includes("<!--"), "quita los comentarios");
comprobar(!texto.includes("&iexcl;") && !texto.includes("<p>"), "quita entidades y etiquetas");
comprobar(htmlATexto("<p>" + "x".repeat(9000) + "</p>").length === 4000, "recorta a 4000 caracteres");

console.log("descargar");
await conFetchFalso((url) => {
  if (url !== ENLACE.url) throw new Error("url inesperada: " + url);
  return respuesta({ cuerpo: HTML });
}, async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(d.leida && d.texto.includes("días hábiles"), "200 HTML se lee");
  comprobar(d.url === ENLACE.url, "la url citada es la intentada");
});

await conFetchFalso(() => respuesta({ status: 403, cuerpo: "denegado" }), async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida && d.texto === "", "403 se marca como no leída");
});

await conFetchFalso(() => respuesta({ status: 500 }), async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "500 se marca como no leída");
});

await conFetchFalso(() => respuesta({ tipo: "application/pdf", cuerpo: "%PDF-1.4" }), async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "un PDF no es HTML legible");
});

await conFetchFalso(async () => {
  throw new TypeError("fetch failed");
}, async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "una red caída no lanza, marca no leída");
});

await conFetchFalso((url) => {
  const destino = "https://ejemplo-fuera.com/otro";
  console.assert(url !== destino);
  return respuesta({ status: 302, location: destino });
}, async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "redirect fuera de los dominios permitidos: no se sigue");
});

await conFetchFalso((url) =>
  url === ENLACE.url
    ? respuesta({ status: 301, location: "https://www.boe.es/buscar/otra" })
    : respuesta({ cuerpo: HTML }),
  async () => {
    const [d] = await descargar([ENLACE]);
    comprobar(d.leida && d.texto.includes("Ley 39/2015"), "redirect dentro del dominio permitido: se sigue");
  },
);

await conFetchFalso((url) =>
  respuesta({ status: 302, cuerpo: HTML, location: url === ENLACE.url ? "https://www.boe.es/a" : "https://www.boe.es/b" }),
async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "un bucle de redirects corta sin colgarse");
});

await conFetchFalso(() => respuesta({ cuerpo: "<html><body>   </body></html>" }), async () => {
  const [d] = await descargar([ENLACE]);
  comprobar(!d.leida, "una página sin texto visible se marca no leída");
});

console.log("límites");
await conFetchFalso((url) => respuesta({ cuerpo: HTML }), async () => {
  const muchas = Array.from({ length: 5 }, (_, i) => ({ nombre: `p${i}`, url: `${ENLACE.url}&x=${i}` }));
  const ds = await descargar(muchas);
  comprobar(ds.length === 3, "descarga como máximo 3 páginas");
  comprobar(ds.every((d) => d.leida), "las tres se leen");
});

await conFetchFalso(() => {
  throw new TypeError("no debería llegar a red");
}, async () => {
  const [d] = await descargar([{ nombre: "x", url: "http://www.boe.es/" }]);
  comprobar(!d.leida, "una url http no permitida ni se intenta");
});

if (fallos > 0) {
  console.error(`\n${fallos} comprobaciones han fallado`);
  process.exit(1);
}
console.log("\nToda la descarga va bien");
