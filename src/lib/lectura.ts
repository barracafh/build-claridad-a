// Contrato que consume el front. El servidor devuelve un objeto `Lectura`
// o un error { error, codigo }. Nada del documento del ciudadano viaja aquí.
export type Categoria =
  | "PIERDE_DERECHO"
  | "SANCION"
  | "PAGAR"
  | "HACER"
  | "ACTUAR_SI_QUIERES"
  | "INFORMA";

export type EstadoCalculo =
  | "CALCULADA"
  | "FALTA_FECHA_NOTIFICACION"
  | "PLAZO_NO_IDENTIFICADO";

// Guía corta construida tras la lectura: el servidor descarga 1 a 3 webs
// oficiales del catálogo (src/lib/sedes.ts y src/lib/guia.ts) y el modelo
// explica en corto cómo se resuelve. Opcional: la Lectura es válida sin ella.
export type GuiaEnlace = { nombre: string; url: string; leida: boolean };

export type Guia = {
  texto: string; // máximo 4 frases
  pasos: string[]; // máximo 4, una línea cada uno
  enlaces: GuiaEnlace[]; // los que se intentó abrir; leida = si llegó texto
};

export type Lectura = {
  emisor: string | null;
  tipoActo: string | null;
  categoria: Categoria | null;
  queDice: string;
  queHacer: { texto: string }[];
  plazo: {
    estado: EstadoCalculo;
    fechaNotificacion: string | null;
    fechaLimite: string | null;
    vencido: boolean;
    fraseOriginal: string | null;
    regla: string | null;
  };
  siNoHacesNada: string;
  siYaVencio: string | null;
  sede: { nombre: string; url: string } | null;
  guia?: Guia;
  fuentes: { nombre: string; url: string }[];
  aviso: string;
  idioma: string;
  confianza: "ALTA" | "MEDIA" | "BAJA" | null;
};

export type CodigoError = "formato" | "tamano" | "paginas" | "lectura";

export type ErrorApi = { error: string; codigo: CodigoError };

// Lo que el modelo extrae del documento. `fechaLimite` la calcula el
// servidor en src/lib/plazos.ts a partir de estos hechos, no el modelo.
export type UnidadPlazo = "DIAS_HABILES" | "DIAS_NATURALES" | "MESES" | "FECHA_FIJA";

export type PlazoExtraido = {
  fraseOriginal: string | null;
  regla: string | null;
  cantidad: number | null;
  unidad: UnidadPlazo | null;
  fechaNotificacion: string | null;
  fechaLiteral: string | null;
  electoral: boolean;
};

export type ExtraccionModelo = {
  emisor: string | null;
  tipoActo: string | null;
  categoria: Categoria | null;
  queDice: string;
  queHacer: { texto: string }[];
  plazo: PlazoExtraido;
  siNoHacesNada: string;
  siYaVencio: string | null;
  sede: { nombre: string; url: string } | null;
  fuentes: { nombre: string; url: string }[];
  idioma: string;
  confianza: "ALTA" | "MEDIA" | "BAJA" | null;
};

export const AVISO_FIJO =
  "Herramienta experimental. No es un servicio oficial. El documento se envía a un proveedor de IA y no se guarda. La fecha límite es un cálculo orientativo, no asesoramiento legal: confírmala en la sede del órgano.";
