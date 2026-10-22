// Prueba de la guía: parseo de la respuesta del modelo y comportamiento de
// lecturaConGuia con la red falsa (descargas de webs y llamada a HelmCode).
// Se ejecuta con `bun src/lib/guia.prueba.ts`: 0 si todo va bien. Sin modelo
// real ni documento alguno: todo en memoria.
import { lecturaConGuia, parsearGuia, SYSTEM_PROMPT_GUIA } from "./guia";
import type { Lectura } from "./lectura";

let fallos = 0;
function comprobar(cond: boolean, titulo: string): void {
  if (cond) {
    console.log(`  ✓ ${titulo}`);
  } else {
    fallos++;
    console.error(`  ✗ ${titulo}`);
  }
}

console.log("parsearGuia");
const ok = parsearGuia('```json\n{"texto": "Frase uno. Frase dos.", "pasos": ["Uno", "Dos"]}\n```');
comprobar(ok?.texto === "Frase uno. Frase dos." && ok.pasos.length === 2, "acepta JSON con cercas de código");
comprobar(parsearGuia("no hay json aquí") === null, "sin JSON devuelve null");
comprobar(parsearGuia('{"texto": "", "pasos": []}') === null, "texto vacío devuelve null");
const conExtras = parsearGuia('{"texto": "Hola", "pasos": ["a", "", 3, "b", "c", "d", "e"]}');
comprobar(conExtras?.pasos.length === 4, "máximo 4 pasos, solo strings con contenido");
const conObjetos = parsearGuia(
  '{"texto": "Hola", "pasos": [{"paso": "Uno"}, {"texto": "Dos"}, 42, {"sin": "campo útil"}, "Tres"]}',
);
comprobar(
  conObjetos?.pasos.length === 3 && conObjetos.pasos[0] === "Uno" && conObjetos.pasos[1] === "Dos",
  "acepta pasos como objeto (paso/texto) y descarta el resto",
);
const largo = parsearGuia(JSON.stringify({ texto: "x".repeat(2000), pasos: [] }));
comprobar(largo?.texto.length === 700, "el texto se recorta");

const lectura = (p: Partial<Lectura> = {}): Lectura => ({
  emisor: "Agencia Tributaria",
  tipoActo: "Requerimiento de documentación",
  categoria: "HACER",
  queDice: "Te pide papeles.",
  queHacer: [{ texto: "Envíalos por la sede." }],
  plazo: {
    estado: "CALCULADA",
    fechaNotificacion: "2026-10-02",
    fechaLimite: "2026-10-20",
    vencido: false,
    fraseOriginal: "DIEZ DÍAS hábiles",
    regla: "10 días hábiles, Ley 39/2015 art. 30",
  },
  siNoHacesNada: "Liquidación con sus datos.",
  siYaVencio: null,
  sede: null,
  fuentes: [],
  aviso: "",
  idioma: "es",
  confianza: "ALTA",
  ...p,
});

const HTML = "<html><body><p>Responde requerimientos en la sede electrónica con Cl@ve.</p></body></html>";
const CHAT = JSON.stringify({
  choices: [{ message: { content: '{"texto": "Entra en la sede de Hacienda con Cl@ve o certificado y contesta el requerimiento. Si te lío: subsanar es completar lo que falta. Tienes de plazo hasta el 20 de octubre. Si no, seguirán con los datos que tengan.", "pasos": ["Entra en la sede de Hacienda con Cl@ve.", "Pulsa «Contestar requerimientos».", "Adjunta los papeles que te piden.", "Guarda el justificante."]}' } }],
});

// fetch falso: webs del catálogo devuelven HTML; HelmCode devuelve el chat.
const conRedFalsa = async (opciones: { chatFalla?: boolean; websFalla?: boolean }, cuerpo: () => Promise<void>) => {
  const original = globalThis.fetch;
  const claves = { key: process.env.HELMCODE_API_KEY, model: process.env.HELMCODE_MODEL };
  process.env.HELMCODE_API_KEY = "prueba";
  process.env.HELMCODE_MODEL = "modelo-de-prueba";
  globalThis.fetch = (async (url: string | URL) => {
    const s = url.toString();
    if (s.includes("helmcode")) {
      if (opciones.chatFalla) throw new TypeError("helmcode caído");
      return new Response(CHAT, { status: 200, headers: { "content-type": "application/json" } });
    }
    if (opciones.websFalla) throw new TypeError("red caída");
    return new Response(HTML, { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  try {
    await cuerpo();
  } finally {
    globalThis.fetch = original;
    if (claves.key === undefined) delete process.env.HELMCODE_API_KEY;
    else process.env.HELMCODE_API_KEY = claves.key;
    if (claves.model === undefined) delete process.env.HELMCODE_MODEL;
    else process.env.HELMCODE_MODEL = claves.model;
  }
};

console.log("lecturaConGuia");
await conRedFalsa({}, async () => {
  const l = await lecturaConGuia(lectura());
  comprobar(!!l.guia, "monta la guía cuando hay webs y modelo");
  comprobar(l.guia?.enlaces.length === 3, "los enlaces son los 3 intentados");
  comprobar(l.guia?.enlaces.every((e) => e.leida) === true, "marcados como leídos");
  comprobar(l.guia?.pasos.length === 4, "pasos del modelo");
  comprobar(l.fuentes.length === 3, "los enlaces se suman a fuentes");
  const duplicada = await lecturaConGuia(lectura({ fuentes: [{ nombre: "Ley 39/2015", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565" }] }));
  comprobar(duplicada.fuentes.length === 3, "sin duplicar una url ya citada");
});

await conRedFalsa({ websFalla: true }, async () => {
  const l = await lecturaConGuia(lectura());
  const g = l.guia;
  comprobar(
    !!g && g.pasos.length === 0 && g.enlaces.every((e) => !e.leida) && g.enlaces.length === 3,
    "webs caídas: pasos vacíos y enlaces no leídos",
  );
  comprobar(l.guia?.texto.split(/[.!?]/).length === 2 && (l.guia?.texto ?? "").startsWith("No he podido"), "una sola frase mandando al enlace");
  comprobar(l.fuentes.length === 3, "los enlaces fallidos también van a fuentes");
});

await conRedFalsa({ chatFalla: true }, async () => {
  const l = await lecturaConGuia(lectura());
  comprobar(l.guia === undefined && l.fuentes.length === 0, "modelo caído: Lectura igual que ahora, sin guia");
});

const desconocido = await lecturaConGuia(lectura({ emisor: "Juzgado de Primera Instancia nº 3" }));
comprobar(desconocido.guia === undefined, "emisor fuera del catálogo: no hay descargas ni llamada");

console.log("system prompt");
comprobar(SYSTEM_PROMPT_GUIA.includes("20 días naturales"), "recuerda la regla DGT: manda la ley (20 días)");

if (fallos > 0) {
  console.error(`\n${fallos} comprobaciones han fallado`);
  process.exit(1);
}
console.log("\nToda la guía va bien");
