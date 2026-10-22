// Descarga de las webs oficiales de la guía, desde el servidor, en memoria.
// Solo https de los dominios del catálogo (src/lib/sedes.ts), un único intento
// por página (sin reintentos en bucle), timeout corto y redirecciones solo
// dentro de los dominios permitidos. No se guarda ni el HTML ni el texto:
// vuelan al terminar la respuesta.
import { esUrlPermitida, type Enlace } from "./sedes";

export type Descarga = {
  nombre: string;
  url: string; // la que se intentó abrir, nunca la del redirect
  leida: boolean;
  texto: string; // "" si no se pudo leer
};

const TIMEOUT_MS = 8000;
const MAX_SALTOS_REDIRECT = 3;
const MAX_TEXTO_PAGINA = 4000;
const MAX_PAGINAS = 3;
const USER_AGENT =
  "Claridad/1.0 (herramienta ciudadana experimental; no guarda datos)";

// De HTML a texto visible: fuera comentarios, script, style y etiquetas.
// Sin DOM ni dependencias; suficiente para leer una página pública.
const ENTIDADES: Record<string, string> = {
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", uuml: "ü",
  ntilde: "ñ", Ntilde: "Ñ", iexcl: "¡", iquest: "¿", ordm: "º",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  ccedil: "ç", Ccedil: "Ç", acirc: "â", ecirc: "ê", ocirc: "ô", icirc: "î", ucirc: "û",
  laquo: "«", raquo: "»", mdash: "—", ndash: "–", ldquo: "“", rdquo: "”",
};

export function htmlATexto(html: string): string {
  const texto = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|head|iframe|template|form)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&(\w+);/g, (todo, nombre: string) => ENTIDADES[nombre] ?? todo)
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return texto.slice(0, MAX_TEXTO_PAGINA);
}

// Descarga hasta 3 páginas en paralelo, un intento por cada una. Una página
// que no responde, responde 403 o no es HTML legible se marca como no leída
// y se sigue: nunca tira la guía entera.
export async function descargar(enlaces: Enlace[]): Promise<Descarga[]> {
  return Promise.all(enlaces.slice(0, MAX_PAGINAS).map(descargarUno));
}

async function descargarUno(enlace: Enlace): Promise<Descarga> {
  const noLeida = (): Descarga => ({ ...enlace, leida: false, texto: "" });
  if (!esUrlPermitida(enlace.url)) return noLeida();

  let url = enlace.url;
  for (let salto = 0; salto <= MAX_SALTOS_REDIRECT; salto++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual", // se sigue a mano: solo dentro de los dominios permitidos
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      });
    } catch {
      return noLeida(); // timeout, red, certificado… sin reintento
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const destino = res.headers.get("location");
      if (!destino) return noLeida();
      try {
        url = new URL(destino, url).toString();
      } catch {
        return noLeida();
      }
      if (!esUrlPermitida(url)) return noLeida(); // fuera de los dominios: no se sigue
      continue;
    }

    if (!res.ok) return noLeida();
    const tipo = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(tipo)) return noLeida();
    let html: string;
    try {
      html = await res.text();
    } catch {
      return noLeida();
    }
    const texto = htmlATexto(html);
    if (!texto) return noLeida();
    return { nombre: enlace.nombre, url: enlace.url, leida: true, texto };
  }
  return noLeida();
}
