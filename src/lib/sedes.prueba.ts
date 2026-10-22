// Prueba del catálogo de sedes. Se ejecuta con `bun src/lib/sedes.prueba.ts`:
// 0 si todo va bien. Sin red, sin modelo, sin ficheros: todo en memoria.
// Comprueba que AEAT, DGT, SEPE e INSS salen en https conocidos y que un
// emisor desconocido no inventa URL ninguna.
import { elegirEnlaces, esUrlPermitida } from "./sedes";
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

const lectura = (p: Partial<Lectura> = {}): Lectura => ({
  emisor: null,
  tipoActo: null,
  categoria: "HACER",
  queDice: "",
  queHacer: [],
  plazo: {
    estado: "PLAZO_NO_IDENTIFICADO",
    fechaNotificacion: null,
    fechaLimite: null,
    vencido: false,
    fraseOriginal: null,
    regla: null,
  },
  siNoHacesNada: "",
  siYaVencio: null,
  sede: null,
  fuentes: [],
  aviso: "",
  idioma: "es",
  confianza: null,
  ...p,
});

const urls = (l: Lectura) => elegirEnlaces(l).map((e) => e.url);

console.log("esUrlPermitida: solo https de los hosts del catálogo");
comprobar(esUrlPermitida("https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565"), "acepta https://www.boe.es");
comprobar(!esUrlPermitida("http://www.boe.es/buscar/act.php?id=BOE-A-2015-10565"), "rechaza http");
comprobar(!esUrlPermitida("https://www.suma.es"), "rechaza dominios fuera del catálogo");
comprobar(!esUrlPermitida("https://boe.es/buscar/act.php?id=BOE-A-2015-10565"), "rechaza host sin www");
comprobar(!esUrlPermitida("no es una url"), "rechaza texto que no es url");

console.log("AEAT");
const aeat = lectura({
  emisor: "Agencia Tributaria · Delegación Especial de Valencia",
  tipoActo: "Requerimiento de documentación",
  sede: { nombre: "Sede AEAT", url: "https://sede.agenciatributaria.gob.es/" },
});
const enlacesAeat = elegirEnlaces(aeat);
comprobar(enlacesAeat[0]?.url === "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml", "G200 primero (qué hacer)");
comprobar(urls(aeat).includes("https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565"), "incluye la Ley 39/2015");
comprobar(enlacesAeat.length <= 3, "máximo 3 enlaces");
comprobar(enlacesAeat.every((e) => esUrlPermitida(e.url)), "todos https del catálogo");

const lgt = { nombre: "Ley General Tributaria", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186" };
const aeatLgt = lectura({
  emisor: "AEAT",
  tipoActo: "Providencia de apremio",
  fuentes: [lgt, lgt],
});
comprobar(urls(aeatLgt).includes(lgt.url), "la norma BOE que trae la lectura entra");
comprobar(urls(aeatLgt).filter((u) => u === lgt.url).length === 1, "sin duplicar url");
comprobar(urls(aeatLgt).length <= 3, "máximo 3 con la norma de la lectura");

const aeatSuma = lectura({
  emisor: "Agencia Tributaria",
  tipoActo: "Requerimiento",
  fuentes: [{ nombre: "SUMA", url: "https://www.suma.es" }],
});
comprobar(!urls(aeatSuma).includes("https://www.suma.es"), "no entra un dominio ajeno al catálogo");

console.log("DGT");
const dgt = lectura({
  emisor: "Jefatura Central de Tráfico (DGT)",
  tipoActo: "Notificación de denuncia de tráfico",
  plazo: {
    estado: "CALCULADA",
    fechaNotificacion: "2026-10-14",
    fechaLimite: "2026-11-03",
    vencido: false,
    fraseOriginal: "reducción del 50 % si paga en 20 días naturales",
    regla: "20 días naturales, RDL 6/2015 art. 93.1",
  },
});
comprobar(
  JSON.stringify(urls(dgt)) ===
    JSON.stringify([
      "https://www.dgt.es/nuestros-servicios/multas-y-sanciones/que-hacer-si-has-recibido-una-multa/",
      "https://sede.dgt.gob.es/es/multas/",
      "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722",
    ]),
  "multas, sede y ley de tráfico (habla de plazos)",
);
const dgtSinPlazo = lectura({ emisor: "DGT", tipoActo: "Comunicación" });
comprobar(
  !urls(dgtSinPlazo).includes("https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722"),
  "sin plazos no entra la ley de tráfico",
);

console.log("SEPE");
const sepe = lectura({ emisor: "Servicio Público de Empleo Estatal (SEPE)", tipoActo: "Requerimiento" });
comprobar(JSON.stringify(urls(sepe)) === JSON.stringify(["https://sede.sepe.gob.es/portalSede"]), "solo la sede del SEPE");

console.log("INSS / IMV");
const imv = lectura({ emisor: "INSS", tipoActo: "Requerimiento del Ingreso Mínimo Vital" });
comprobar(
  JSON.stringify(urls(imv)) ===
    JSON.stringify([
      "https://sede.seg-social.gob.es/wps/portal/sede/sede/Inicio",
      "https://www.boe.es/buscar/act.php?id=BOE-A-2021-21007",
    ]),
  "sede de la Seguridad Social más la Ley 19/2021 (IMV)",
);
const inss = lectura({ emisor: "Instituto Nacional de la Seguridad Social", tipoActo: "Requerimiento" });
comprobar(
  JSON.stringify(urls(inss)) === JSON.stringify(["https://sede.seg-social.gob.es/wps/portal/sede/sede/Inicio"]),
  "INSS sin IMV: solo la sede",
);

console.log("Generalitat y Ajuntament: solo páginas que ya traiga la lectura");
const gva = lectura({
  emisor: "Generalitat Valenciana · Conselleria de Hacienda",
  tipoActo: "Denegación de la Renta Valenciana",
  sede: { nombre: "GVA", url: "https://www.gva.es/es/inicio" },
});
comprobar(JSON.stringify(urls(gva)) === JSON.stringify(["https://www.gva.es/es/inicio"]), "GVA con sede de la lectura");
comprobar(elegirEnlaces(lectura({ emisor: "Generalitat Valenciana", tipoActo: "Denegación" })).length === 0, "GVA sin URLs de la lectura: nada");
const valencia = lectura({
  emisor: "Ajuntament de València",
  tipoActo: "Trámite de audiencia por baja en el padrón",
  fuentes: [{ nombre: "Valencia", url: "https://sede.valencia.es/Cidadania" }],
});
comprobar(JSON.stringify(urls(valencia)) === JSON.stringify(["https://sede.valencia.es/Cidadania"]), "Ajuntament con fuente de la lectura");
comprobar(elegirEnlaces(lectura({ emisor: "Ajuntament de València", tipoActo: "Trámite" })).length === 0, "Ajuntament sin URLs de la lectura: nada");

console.log("Emisor desconocido: no inventa URL");
comprobar(
  elegirEnlaces(lectura({ emisor: "Junta Electoral de Zona de València", tipoActo: "Designación de mesa" })).length === 0,
  "Junta Electoral: nada",
);
comprobar(
  elegirEnlaces(
    lectura({
      emisor: "Juzgado de Primera Instancia nº 3",
      tipoActo: "Notificación",
      fuentes: [{ nombre: "BOE", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565" }],
    }),
  ).length === 0,
  "Juzgado ni aunque cite el BOE: nada",
);
comprobar(elegirEnlaces(lectura()).length === 0, "sin emisor: nada");

if (fallos > 0) {
  console.error(`\n${fallos} comprobaciones han fallado`);
  process.exit(1);
}
console.log("\nTodo el catálogo va bien");
