// Lenguas oficiales de España que se pueden elegir. Lo comparten la pantalla
// (textos y fechas) y la API (en qué lengua responde el modelo).
export type Lengua = {
  codigo: "es" | "ca" | "va" | "eu" | "gl" | "oc";
  nombre: string; // en su propia lengua, como se muestra en el selector
  html: string; // atributo lang (BCP 47)
  locale: string; // para las fechas
  prompt: string; // cómo se nombra en las instrucciones al modelo
};

export const LENGUAS: readonly Lengua[] = [
  {
    codigo: "es",
    nombre: "Castellano",
    html: "es",
    locale: "es-ES",
    prompt: "castellano",
  },
  {
    codigo: "ca",
    nombre: "Català",
    html: "ca",
    locale: "ca-ES",
    prompt: "catalán",
  },
  {
    codigo: "va",
    nombre: "Valencià",
    html: "ca-valencia",
    locale: "ca-ES-valencia",
    prompt: "valenciano",
  },
  {
    codigo: "eu",
    nombre: "Euskara",
    html: "eu",
    locale: "eu-ES",
    prompt: "euskera",
  },
  {
    codigo: "gl",
    nombre: "Galego",
    html: "gl",
    locale: "gl-ES",
    prompt: "gallego",
  },
  {
    codigo: "oc",
    nombre: "Aranés",
    html: "oc-aranese",
    locale: "oc-ES",
    prompt: "aranés (occitano del Valle de Arán)",
  },
];

export const lenguaPorCodigo = (codigo: unknown): Lengua | null =>
  LENGUAS.find((l) => l.codigo === codigo) ?? null;
