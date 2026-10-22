import { buttonVariants } from "@/components/ui/button";
import { site } from "@/config/sitio";

// Se conserva siempre (regla 5 de la plataforma). `discreto` lo deja como
// enlace de texto para que no compita con la acción principal de la pantalla.
export function BotonAviso({ discreto = false }: { discreto?: boolean }) {
  return (
    <a
      href={site.feedbackUrl}
      className={
        discreto
          ? "inline-flex min-h-11 items-center text-sm text-(--text-secondary) underline underline-offset-4 hover:text-foreground focus-visible:rounded focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          : buttonVariants({ variant: "sunset", size: "lg" })
      }
    >
      ¿Algo está mal? Avísanos
    </a>
  );
}
