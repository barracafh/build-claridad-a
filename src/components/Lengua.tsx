"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LENGUAS, lenguaPorCodigo, type Lengua } from "@/lib/lenguas";
import { TEXTOS, type Textos } from "@/lib/textos";

// La lengua elegida vive solo en memoria: al recargar vuelve a la del
// navegador (o a castellano). No se guarda nada.
const Contexto = createContext<{
  lengua: Lengua;
  t: Textos;
  elegir: (codigo: string) => void;
}>({ lengua: LENGUAS[0], t: TEXTOS.es, elegir: () => {} });

export const useLengua = () => useContext(Contexto);

export function ProveedorLengua({ children }: { children: ReactNode }) {
  const [lengua, setLengua] = useState<Lengua>(LENGUAS[0]);

  // La del navegador, si es una de las oficiales.
  useEffect(() => {
    const nav = navigator.language.toLowerCase();
    const inicial = nav.includes("valencia")
      ? lenguaPorCodigo("va")
      : lenguaPorCodigo(nav.slice(0, 2));
    if (inicial) setLengua(inicial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lengua.html;
  }, [lengua]);

  return (
    <Contexto.Provider
      value={{
        lengua,
        t: TEXTOS[lengua.codigo],
        elegir: (codigo) => setLengua(lenguaPorCodigo(codigo) ?? LENGUAS[0]),
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function SelectorLengua() {
  const { lengua, t, elegir } = useLengua();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t.lengua}</span>
      <select
        value={lengua.codigo}
        onChange={(e) => elegir(e.target.value)}
        className="h-11 rounded-lg border border-input bg-background px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {LENGUAS.map((l) => (
          <option key={l.codigo} value={l.codigo} lang={l.html}>
            {l.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
