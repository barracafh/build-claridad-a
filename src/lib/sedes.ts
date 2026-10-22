// Catálogo cerrado de sedes oficiales para la guía: las URLs salen de las
// fuentes de contexto.md y de la lista de dominios permitidos del encargo.
// No se busca en ningún otro sitio ni se construye ninguna URL con datos del
// documento (ni NIF, ni CSV, ni expediente). Si el emisor no está aquí, la
// guía no intenta descargas y la Lectura se queda tal cual.
import type { Lectura } from "./lectura";

export type Enlace = { nombre: string; url: string };

const HTTPS = /^https:\/\//i;

// Únicos dominios desde los que se descargan páginas. Cualquier otra cosa
// (buscadores, blogs, sedes con certificado para ver el expediente) queda fuera.
const HOSTS_PERMITIDOS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.boe.es",
  "dgt.es",
  "www.dgt.es",
  "sede.dgt.gob.es",
  "sede.sepe.gob.es",
  "sede.seg-social.gob.es",
  "www.gva.es",
  "sede.gva.es",
  "dogv.gva.es",
  "www.valencia.es",
  "sede.valencia.es",
]);

export function esUrlPermitida(url: string): boolean {
  if (!HTTPS.test(url)) return false;
  try {
    return HOSTS_PERMITIDOS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

type EmisorCatalogo = {
  id: string;
  // Sobre el emisor (y el tipo de acto) en minúsculas y sin acentos.
  coincide: (emisor: string, acto: string) => boolean;
  // URLs del catálogo, en orden de preferencia: la de «qué hacer» antes que
  // la portada. Para Generalitat y Ajuntament el catálogo está vacío: contexto.md
  // solo cita el DOGV de festivos (lo aplica plazos.ts) y ninguna página suya
  // que explique los trámites, así que solo se admiten las que ya traiga la lectura.
  fijos: Enlace[];
  // Hosts de este emisor que se admiten si la lectura ya trae una URL de ellos.
  hostsPropios: string[];
};

const LEY_39_2015: Enlace = {
  nombre: "Ley 39/2015, art. 30: cómo se cuentan los plazos (BOE)",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565",
};

const EMISORES: EmisorCatalogo[] = [
  {
    id: "generalitat",
    coincide: (e) => /generalitat|\bgva\b|renta valenciana|rent valenciana|conselleria/.test(e),
    fijos: [],
    hostsPropios: ["www.gva.es", "sede.gva.es", "dogv.gva.es"],
  },
  {
    id: "ajuntament",
    coincide: (e) => /\bajuntament\b|\bayuntamiento\b/.test(e),
    fijos: [],
    hostsPropios: ["www.valencia.es", "sede.valencia.es"],
  },
  {
    id: "aeat",
    coincide: (e) => /agencia tributaria|\baeat\b|administracion tributaria/.test(e),
    fijos: [
      {
        nombre: "Agencia Tributaria: verificación de datos y comprobación limitada (G200)",
        url: "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml",
      },
      LEY_39_2015,
      {
        nombre: "Sede electrónica de la Agencia Tributaria",
        url: "https://sede.agenciatributaria.gob.es/",
      },
    ],
    hostsPropios: ["sede.agenciatributaria.gob.es"],
  },
  {
    id: "dgt",
    coincide: (e) => /\bdgt\b|jefatura (central )?de trafico|direccion general de trafico/.test(e),
    fijos: [
      {
        nombre: "DGT: qué hacer si has recibido una multa",
        url: "https://www.dgt.es/nuestros-servicios/multas-y-sanciones/que-hacer-si-has-recibido-una-multa/",
      },
      {
        nombre: "Sede electrónica de la DGT: multas",
        url: "https://sede.dgt.gob.es/es/multas/",
      },
      // Solo si el trámite va de plazos (en una multa, casi siempre).
      {
        nombre: "RDL 6/2015, texto refundido de la Ley de Tráfico (BOE)",
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11722",
      },
    ],
    hostsPropios: ["dgt.es", "www.dgt.es", "sede.dgt.gob.es"],
  },
  {
    id: "sepe",
    coincide: (e) => /\bsepe\b|servicio publico de empleo|servi public d.ocupaci/.test(e),
    fijos: [
      {
        nombre: "Sede del SEPE",
        url: "https://sede.sepe.gob.es/portalSede",
      },
    ],
    hostsPropios: ["sede.sepe.gob.es"],
  },
  {
    id: "seg-social",
    coincide: (e) =>
      /\binss\b|seguridad social|seguretat social|ingreso minimo vital|ingres minim vital|\bimv\b/.test(e),
    fijos: [
      {
        nombre: "Sede electrónica de la Seguridad Social",
        url: "https://sede.seg-social.gob.es/wps/portal/sede/sede/Inicio",
      },
    ],
    hostsPropios: ["sede.seg-social.gob.es"],
  },
];

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const hostDe = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

// Elige 1 a 3 enlaces a intentar para la guía, o [] si el emisor no está en el
// catálogo (en cuyo caso la guía no descarga nada y la lectura queda como está).
// Orden: los fijos del catálogo (la de «qué hacer» primero), luego las URLs
// del propio emisor que ya traiga la lectura (sede y fuentes) y, si toca, la
// ley que la lectura cite en fuentes con host www.boe.es.
export function elegirEnlaces(l: Pick<Lectura, "emisor" | "tipoActo" | "sede" | "fuentes" | "plazo">): Enlace[] {
  const emisor = normalizar(l.emisor ?? "");
  if (!emisor) return [];
  const acto = normalizar(l.tipoActo ?? "");
  const entrada = EMISORES.find((e) => e.coincide(emisor, acto));
  if (!entrada) return [];

  const hablaDePlazos = !!(l.plazo.regla || l.plazo.fraseOriginal || l.plazo.fechaLimite);
  const esImv = /imv|ingreso minimo vital|ingres minim vital/.test(`${emisor} ${acto}`);

  const fijos = entrada.fijos.filter((e) => {
    if (entrada.id === "dgt" && e.url.includes("BOE-A-2015-11722")) return hablaDePlazos;
    return true;
  });
  // IMV: la ley va detrás de la sede.
  if (entrada.id === "seg-social" && esImv) {
    fijos.push({
      nombre: "Ley 19/2021, del Ingreso Mínimo Vital (BOE)",
      url: "https://www.boe.es/buscar/act.php?id=BOE-A-2021-21007",
    });
  }

  const deLectura: Enlace[] = [l.sede, ...l.fuentes].flatMap((e) => {
    if (!e || !esUrlPermitida(e.url)) return [];
    const host = hostDe(e.url);
    const propio = host != null && entrada.hostsPropios.includes(host);
    const normaBoe = host === "www.boe.es" && l.fuentes.some((f) => f.url === e.url);
    return propio || normaBoe ? [{ nombre: e.nombre, url: e.url }] : [];
  });

  // El primer fijo (la de «qué hacer») va primero; luego lo concreto que ya
  // traiga la lectura y, al final, el resto de fijos y la norma citada.
  const vistas = new Set<string>();
  const elegidos: Enlace[] = [];
  for (const e of [...fijos.slice(0, 1), ...deLectura, ...fijos.slice(1)]) {
    if (vistas.has(e.url) || !esUrlPermitida(e.url)) continue;
    vistas.add(e.url);
    elegidos.push(e);
    if (elegidos.length === 3) break;
  }
  return elegidos;
}
