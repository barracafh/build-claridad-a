// Cálculo de la fecha límite en el servidor, con los festivos de 2026 en
// València (datos/festivos-2026.json). Reglas: Ley 39/2015 art. 30 y, para
// plazos electorales, LOREG art. 119 (naturales e improrrogables).
// Las fechas van en UTC para que no dependan de la zona horaria del serverless.
import festivos2026 from "../../datos/festivos-2026.json";
import type { PlazoExtraido } from "./lectura";

// Hoy para la demo del build night.
export const HOY = "2026-10-22";

const FESTIVOS: ReadonlySet<string> = new Set(
  festivos2026.festivos.map((f) => f.fecha),
);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

type Fecha = { y: number; m: number; d: number }; // m: 1-12

function aFecha(iso: string): Fecha | null {
  if (!ISO.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d)
    return null;
  return { y, m, d };
}

function isoDe(f: Fecha): string {
  return `${String(f.y).padStart(4, "0")}-${String(f.m).padStart(2, "0")}-${String(f.d).padStart(2, "0")}`;
}

function diasDelMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function sumarDias(f: Fecha, n: number): Fecha {
  const t = new Date(Date.UTC(f.y, f.m - 1, f.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function esInhabil(f: Fecha): boolean {
  const dia = new Date(Date.UTC(f.y, f.m - 1, f.d)).getUTCDay();
  if (dia === 0 || dia === 6) return true;
  return FESTIVOS.has(isoDe(f));
}

function siguienteHabil(f: Fecha): Fecha {
  let g = sumarDias(f, 1);
  while (esInhabil(g)) g = sumarDias(g, 1);
  return g;
}

// Plazo en días hábiles: se cuenta desde el día siguiente a la notificación
// (art. 30.3), sin contar sábados, domingos ni festivos (art. 30.2).
function limiteHabiles(notificacion: Fecha, n: number): Fecha | null {
  if (!Number.isInteger(n) || n < 1) return null;
  let dia = sumarDias(notificacion, 1);
  let contados = 0;
  while (contados < n) {
    if (!esInhabil(dia)) contados++;
    if (contados < n) dia = sumarDias(dia, 1);
  }
  return dia;
}

// Plazo en días naturales: notificación + N; si cae en inhábil, al siguiente
// hábil (art. 30.5), salvo plazos electorales: vencen ese mismo día (LOREG
// art. 119, improrrogables).
function limiteNaturales(notificacion: Fecha, n: number, electoral: boolean): Fecha | null {
  if (!Number.isInteger(n) || n < 1) return null;
  const fin = sumarDias(notificacion, n);
  if (electoral || !esInhabil(fin)) return fin;
  return siguienteHabil(fin);
}

// Plazo en meses: mismo día del mes siguiente (de fecha a fecha, art. 30.4);
// si no existe ese día, el último del mes; si es inhábil, al siguiente hábil.
function limiteMeses(notificacion: Fecha, n: number): Fecha | null {
  if (!Number.isInteger(n) || n < 1) return null;
  const mTotal = notificacion.m - 1 + n;
  const y = notificacion.y + Math.floor(mTotal / 12);
  const m = (mTotal % 12) + 1;
  const d = Math.min(notificacion.d, diasDelMes(y, m));
  const fin = { y, m, d };
  return esInhabil(fin) ? siguienteHabil(fin) : fin;
}

export function calcularFechaLimite(p: PlazoExtraido): string | null {
  const notificacion = p.fechaNotificacion ? aFecha(p.fechaNotificacion) : null;
  if (p.unidad === "FECHA_FIJA") {
    if (!p.fechaLiteral) return null;
    const fija = aFecha(p.fechaLiteral);
    return fija ? isoDe(fija) : null;
  }
  if (!notificacion || typeof p.cantidad !== "number") return null;
  let fin: Fecha | null = null;
  if (p.unidad === "DIAS_HABILES") fin = limiteHabiles(notificacion, p.cantidad);
  if (p.unidad === "DIAS_NATURALES")
    fin = limiteNaturales(notificacion, p.cantidad, p.electoral);
  if (p.unidad === "MESES") fin = limiteMeses(notificacion, p.cantidad);
  return fin ? isoDe(fin) : null;
}

export function estaVencido(fechaLimite: string | null): boolean {
  if (!fechaLimite) return false;
  return fechaLimite < HOY;
}
