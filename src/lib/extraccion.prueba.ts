// Prueba del montaje de la Lectura: vencido lo decide el servidor y siYaVencio
// solo sale si el plazo venció. Se ejecuta con `bun src/lib/extraccion.prueba.ts`:
// 0 si todo va bien. Sin red ni modelo.
import { montarLectura, parsearExtraccion } from "./extraccion";
import type { ExtraccionModelo } from "./lectura";

let fallos = 0;
function comprobar(cond: boolean, titulo: string): void {
  if (cond) {
    console.log(`  ✓ ${titulo}`);
  } else {
    fallos++;
    console.error(`  ✗ ${titulo}`);
  }
}

const extraccion = (p: Partial<ExtraccionModelo> = {}): ExtraccionModelo => ({
  emisor: "Agencia Tributaria",
  tipoActo: "Requerimiento de documentación",
  categoria: "HACER",
  queDice: "Te pide papeles.",
  queHacer: [{ texto: "Envíalos por la sede." }],
  plazo: {
    fraseOriginal: "DIEZ DÍAS hábiles",
    regla: "10 días hábiles, Ley 39/2015 art. 30",
    cantidad: 10,
    unidad: "DIAS_HABILES",
    fechaNotificacion: "2026-10-02",
    fechaLiteral: null,
    electoral: false,
  },
  siNoHacesNada: "Liquidación con sus datos.",
  siYaVencio: null,
  sede: null,
  fuentes: [],
  idioma: "es",
  confianza: "ALTA",
  ...p,
});

console.log("montarLectura: vencido y siYaVencio los decide el servidor");

// Plazo vencido (límite 2026-10-20 < HOY 2026-10-22): se conserva siYaVencio.
const vencido = montarLectura(
  extraccion({ siYaVencio: "Puedes presentarla igualmente." }),
);
comprobar(vencido.plazo.vencido === true, "vencido a true con límite en el pasado");
comprobar(vencido.plazo.fechaLimite === "2026-10-20", "fecha límite calculada");
comprobar(vencido.siYaVencio === "Puedes presentarla igualmente.", "siYaVencio se conserva si venció");

// Plazo en el futuro: siYaVencio del modelo se anula (a veces lo rellena).
const enPlazo = montarLectura(
  extraccion({
    siYaVencio: "El plazo ya venció…", // mentira del modelo
    plazo: {
      fraseOriginal: "DIEZ DÍAS hábiles",
      regla: "10 días hábiles",
      cantidad: 10,
      unidad: "DIAS_HABILES",
      fechaNotificacion: "2026-10-06",
      fechaLiteral: null,
      electoral: false,
    },
  }),
);
comprobar(enPlazo.plazo.vencido === false && enPlazo.plazo.fechaLimite === "2026-10-22", "no vencido con límite de hoy");
comprobar(enPlazo.siYaVencio === null, "siYaVencio se anula si no venció");

// Sin fecha de notificación: no hay cálculo ni vencido; siYaVencio, anulada.
const sinFecha = montarLectura(
  extraccion({
    siYaVencio: "El plazo ya venció…",
    plazo: {
      fraseOriginal: "DIEZ DÍAS hábiles",
      regla: "10 días hábiles",
      cantidad: 10,
      unidad: "DIAS_HABILES",
      fechaNotificacion: null,
      fechaLiteral: null,
      electoral: false,
    },
  }),
);
comprobar(
  sinFecha.plazo.estado === "FALTA_FECHA_NOTIFICACION" &&
    sinFecha.plazo.fechaLimite === null &&
    sinFecha.plazo.vencido === false,
  "sin fecha de notificación: FALTA_FECHA_NOTIFICACION",
);
comprobar(sinFecha.siYaVencio === null, "siYaVencio se anula si no hay cálculo");

console.log("parsearExtraccion: filtra lo que no es del esquema");
comprobar(parsearExtraccion("texto sin json") === null, "sin JSON devuelve null");
const conBasura = parsearExtraccion(
  '```json\n{"queDice":" Dice cosas. ","siNoHacesNada":" Nada. ","plazo":{"cantidad":"diez","unidad":"SEMANAS"},"fuentes":[{"nombre":"BOE","url":"http://insegura.es"}]}\n```',
);
comprobar(
  conBasura?.queDice === "Dice cosas." &&
    conBasura.plazo.cantidad === null &&
    conBasura.plazo.unidad === null &&
    conBasura.fuentes.length === 0,
  "rechaza cantidad no numérica, unidad rara y fuentes http",
);

if (fallos > 0) {
  console.error(`\n${fallos} comprobaciones han fallado`);
  process.exit(1);
}
console.log("\nEl montaje de la Lectura va bien");
