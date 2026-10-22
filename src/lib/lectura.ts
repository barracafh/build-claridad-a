// Contrato que consume el front. El servidor devuelve un objeto `Lectura`
// o un error { error, codigo }. Nada del documento del ciudadano viaja aquí.
export type Lectura = {
  queDice: string;
  queHacer: { texto: string }[];
  plazo: {
    fechaLimite: string | null;
    vencido: boolean;
    fraseOriginal: string | null;
    regla: string | null;
  };
  siNoHacesNada: string;
  sede: { nombre: string; url: string } | null;
  fuentes: { nombre: string; url: string }[];
  aviso: string;
  idioma: string;
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
  queDice: string;
  queHacer: { texto: string }[];
  plazo: PlazoExtraido;
  siNoHacesNada: string;
  sede: { nombre: string; url: string } | null;
  fuentes: { nombre: string; url: string }[];
  idioma: string;
};

export const AVISO_FIJO =
  "Herramienta experimental. No es un servicio oficial. El documento se envía a un proveedor de IA y no se guarda. La fecha límite es un cálculo orientativo, no asesoramiento legal: confírmala en la sede del órgano.";
