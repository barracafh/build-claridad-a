import { Badge } from "@/components/ui/badge";
import { BotonAviso } from "@/components/BotonAviso";
import { Claridad } from "@/components/Claridad";
import ficha from "../../ficha.json";

// Pantalla única pensada para el móvil: sin scroll de página. Cabecera arriba,
// la herramienta en medio y el aviso abajo.
export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[560px] shrink-0 items-center justify-between gap-4 px-(--page-gutter) py-3 bajo:py-1.5">
        <span className="inline-flex items-center gap-3 text-lg leading-tight font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xl text-white"
          >
            {ficha.icono}
          </span>
          {ficha.nombre}
        </span>
        <Badge variant="outline">
          {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"}
        </Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none"
      >
        <Claridad />
      </main>

      <footer className="shrink-0 border-t">
        <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 px-(--page-gutter) py-2">
          <p className="text-sm text-(--text-secondary)">
            Squad <span className="font-mono">{ficha.equipo}</span>
          </p>
          <BotonAviso discreto />
        </div>
      </footer>
    </>
  );
}
