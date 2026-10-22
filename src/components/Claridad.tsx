"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, FileText, Lock, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ruta } from "@/config/sitio";
import type { Lectura } from "@/lib/lectura";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { ejemploPorDefecto, ejemplos } from "@/datos/ejemplos";
import {
  deLectura,
  estadoPlazo,
  fechaLarga,
  textoCategoria,
  type Resultado,
} from "@/lib/resultado";

// Todo vive en memoria: ni el archivo ni el resultado se guardan. Al terminar
// o al recargar, se pierde.

type Pantalla =
  | { tipo: "inicio" }
  | { tipo: "ejemplos" }
  | { tipo: "confirmar"; archivo: File; vista: string | null }
  | {
      tipo: "leyendo";
      resultado: Resultado | null;
      ejemploFaltaFecha?: boolean;
    }
  | { tipo: "falta-fecha" }
  | { tipo: "resultado"; resultado: Resultado; pagina: number };

// Límite del servidor (4 MB en la petición): se comprueba antes de subir.
const MAX_BYTES = 4 * 1024 * 1024;

// Botones grandes: se usan con el pulgar y con poca vista.
const grande = "h-14 w-full gap-3 rounded-xl text-lg bajo:h-12 bajo:text-base";
// El sol de la vista, en plano: sin degradado y con texto oscuro (contraste ~12:1).
const sol = "bg-brand-yellow text-foreground";

export function Claridad() {
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "inicio" });
  const titulo = useRef<HTMLHeadingElement>(null);
  const camara = useRef<HTMLInputElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  // La carta que se está leyendo: hace falta si el servidor pide la fecha
  // de notificación y hay que repetir la lectura con ella.
  const pendiente = useRef<File | null>(null);

  // Al cambiar de pantalla, el foco va al titular (lectores de pantalla).
  const clave =
    pantalla.tipo === "resultado"
      ? `resultado-${pantalla.pagina}`
      : pantalla.tipo;
  useEffect(() => {
    titulo.current?.focus();
  }, [clave]);

  // Los ejemplos son datos inventados: se muestran al instante, sin IA.
  useEffect(() => {
    if (pantalla.tipo !== "leyendo") return;
    if (pantalla.resultado) {
      const t = setTimeout(
        () =>
          setPantalla({
            tipo: "resultado",
            resultado: pantalla.resultado!,
            pagina: 0,
          }),
        2200,
      );
      return () => clearTimeout(t);
    }
    if (pantalla.ejemploFaltaFecha) {
      const t = setTimeout(() => setPantalla({ tipo: "falta-fecha" }), 2200);
      return () => clearTimeout(t);
    }
    // Con el archivo real, la respuesta llega al terminar la petición.
  }, [pantalla]);

  async function leerArchivo(f: File, fecha?: string) {
    setAviso(null);
    pendiente.current = f;
    setPantalla({ tipo: "leyendo", resultado: null });
    try {
      const datos = new FormData();
      datos.append("documento", f);
      if (fecha) datos.append("fecha", fecha);
      const res = await fetch(ruta("/api/documento"), {
        method: "POST",
        body: datos,
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPantalla({ tipo: "inicio" });
        setAviso(
          e?.error ??
            "No se ha podido leer tu carta ahora mismo. Prueba otra vez en unos segundos.",
        );
        return;
      }
      const lectura: Lectura = await res.json();
      const resultado = deLectura(lectura);
      if (resultado.plazo.estadoCalculo === "FALTA_FECHA_NOTIFICACION") {
        setPantalla({ tipo: "falta-fecha" });
        return;
      }
      setPantalla({ tipo: "resultado", resultado, pagina: 0 });
    } catch {
      setPantalla({ tipo: "inicio" });
      setAviso(
        "No se ha podido leer tu carta ahora mismo. Comprueba tu conexión y prueba otra vez.",
      );
    }
  }

  const vistaPrevia = pantalla.tipo === "confirmar" ? pantalla.vista : null;
  useEffect(
    () => () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia],
  );

  function abrir(f: File) {
    // El servidor solo lee PDF, JPG y PNG (es lo que ve el modelo de visión).
    const tipoOk =
      f.type === "" /* cámaras que no informan el tipo: lo decide el servidor */ ||
      f.type === "application/pdf" ||
      f.type === "image/jpeg" ||
      f.type === "image/png";
    if (!tipoOk) {
      setPantalla({ tipo: "inicio" });
      setAviso(
        `«${f.name}» no es un PDF ni una foto JPG o PNG. Prueba con la carta en PDF o con una foto.`,
      );
      return;
    }
    if (f.size > MAX_BYTES) {
      setPantalla({ tipo: "inicio" });
      setAviso(
        `«${f.name}» es demasiado grande (más de 4 MB). Baja su tamaño o calidad y vuelve a intentarlo.`,
      );
      return;
    }
    setAviso(null);
    setPantalla({
      tipo: "confirmar",
      archivo: f,
      vista: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    });
  }

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) abrir(f);
  }

  // Arrastrar y soltar desde el ordenador. Se escucha en toda la ventana para
  // que el navegador no abra el archivo por su cuenta al soltarlo fuera.
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;
  const aceptaArchivo =
    pantalla.tipo === "inicio" ||
    pantalla.tipo === "ejemplos" ||
    pantalla.tipo === "confirmar";
  const aceptaRef = useRef(aceptaArchivo);
  aceptaRef.current = aceptaArchivo;
  useEffect(() => {
    let dentro = 0;
    const conArchivos = (e: DragEvent) =>
      e.dataTransfer?.types.includes("Files") ?? false;
    const entra = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      dentro++;
      if (aceptaRef.current) setArrastrando(true);
    };
    const sale = () => {
      dentro = Math.max(0, dentro - 1);
      if (dentro === 0) setArrastrando(false);
    };
    const encima = (e: DragEvent) => {
      if (conArchivos(e)) e.preventDefault();
    };
    const suelta = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      dentro = 0;
      setArrastrando(false);
      const f = e.dataTransfer?.files[0];
      if (f && aceptaRef.current) abrirRef.current(f);
    };
    window.addEventListener("dragenter", entra);
    window.addEventListener("dragleave", sale);
    window.addEventListener("dragover", encima);
    window.addEventListener("drop", suelta);
    return () => {
      window.removeEventListener("dragenter", entra);
      window.removeEventListener("dragleave", sale);
      window.removeEventListener("dragover", encima);
      window.removeEventListener("drop", suelta);
    };
  }, []);

  const inicio = () => {
    setAviso(null);
    setPantalla({ tipo: "inicio" });
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col px-(--page-gutter)">
      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={elegir}
      />
      <input
        ref={archivo}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={elegir}
      />

      {arrastrando && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-3 z-40 grid place-items-center rounded-2xl border-4 border-dashed border-foreground bg-background/95 p-6 text-center"
        >
          <p className="flex flex-col items-center gap-4 text-2xl font-medium">
            <FileText className="size-12" />
            Suelta aquí la carta
          </p>
        </div>
      )}

      {pantalla.tipo === "inicio" && (
        <Vista
          cuerpo={
            <>
              <h1
                ref={titulo}
                tabIndex={-1}
                className="text-[clamp(32px,8vw,48px)] leading-[1.1] tracking-[-0.02em] outline-none bajo:text-[26px]"
              >
                ¿Qué carta te ha llegado?
              </h1>
              <p className="mt-3 text-lg text-(--text-secondary) bajo:text-base">
                Hazle una foto o elige el PDF. Te explicamos qué dice, qué
                tienes que hacer y hasta cuándo.
                <span className="hidden pointer-fine:inline">
                  {" "}
                  También puedes arrastrarla aquí.
                </span>
              </p>
              {aviso && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border-2 border-foreground px-4 py-3 text-base font-medium bajo:mt-2"
                >
                  {aviso}
                </p>
              )}
              <p className="mt-4 flex gap-3 rounded-xl bg-muted px-4 py-3 text-base bajo:mt-2">
                <Lock aria-hidden="true" className="mt-1 size-5 shrink-0" />
                <span>
                  No guardamos tu carta. Para leerla, se envía a una
                  inteligencia artificial externa y se borra al terminar.
                </span>
              </p>
            </>
          }
          acciones={
            <>
              <Button
                variant="sunset"
                className={grande}
                onClick={() => camara.current?.click()}
              >
                <Camera aria-hidden="true" className="size-6" />
                Hacer una foto a la carta
              </Button>
              <Button
                variant="outline"
                className={grande}
                onClick={() => archivo.current?.click()}
              >
                <FileText aria-hidden="true" className="size-6" />
                Elegir un PDF o una foto
              </Button>
              <Button
                variant="ghost"
                className="h-11 w-full text-base"
                onClick={() => setPantalla({ tipo: "ejemplos" })}
              >
                Probar con una carta de ejemplo
              </Button>
            </>
          }
        />
      )}

      {pantalla.tipo === "ejemplos" && (
        <Vista
          cuerpo={
            <>
              <h1
                ref={titulo}
                tabIndex={-1}
                className="text-[clamp(28px,7vw,40px)] leading-[1.1] outline-none bajo:text-[26px]"
              >
                Elige una carta de ejemplo
              </h1>
              <p className="mt-3 text-lg text-(--text-secondary) bajo:text-base">
                Son cartas inventadas, con datos ficticios.
              </p>
              <ul className="mt-6 grid gap-3 bajo:mt-3">
                {ejemplos.map((e) => (
                  <li key={e.id}>
                    <Button
                      variant="outline"
                      className={cn(grande, "justify-start text-left")}
                      onClick={() =>
                        setPantalla({ tipo: "leyendo", resultado: e.resultado })
                      }
                    >
                      <FileText aria-hidden="true" className="size-6" />
                      <span className="truncate">{e.etiqueta}</span>
                    </Button>
                  </li>
                ))}
                <li>
                  <Button
                    variant="outline"
                    className={cn(grande, "justify-start text-left")}
                    onClick={() =>
                      setPantalla({
                        tipo: "leyendo",
                        resultado: null,
                        ejemploFaltaFecha: true,
                      })
                    }
                  >
                    <FileText aria-hidden="true" className="size-6" />
                    <span className="truncate">
                      Una carta sin fecha de llegada
                    </span>
                  </Button>
                </li>
              </ul>
            </>
          }
          acciones={
            <Button variant="secondary" className={grande} onClick={inicio}>
              Volver
            </Button>
          }
        />
      )}

      {pantalla.tipo === "confirmar" && (
        <Vista
          cuerpo={
            <>
              <h1
                ref={titulo}
                tabIndex={-1}
                className="text-[clamp(28px,7vw,40px)] leading-[1.1] outline-none bajo:text-[26px]"
              >
                ¿Es esta la carta?
              </h1>
              <div className="mt-6 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl bg-muted p-4 bajo:mt-3">
                {pantalla.vista ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista local de un blob, no pasa por next/image
                  <img
                    src={pantalla.vista}
                    alt="Foto de la carta que has elegido"
                    className="max-h-full min-h-0 rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <FileText aria-hidden="true" className="size-16" />
                    <p className="mt-3 max-w-full text-center font-mono text-sm [overflow-wrap:anywhere]">
                      {pantalla.archivo.name}
                    </p>
                  </>
                )}
              </div>
            </>
          }
          acciones={
            <>
              <Button
                variant="sunset"
                className={grande}
                onClick={() => leerArchivo(pantalla.archivo)}
              >
                Sí, explícamela
              </Button>
              <Button variant="outline" className={grande} onClick={inicio}>
                No, elegir otra
              </Button>
            </>
          }
        />
      )}

      {pantalla.tipo === "leyendo" && (
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-12 text-brand motion-safe:animate-spin"
          />
          <h1
            ref={titulo}
            tabIndex={-1}
            className="mt-6 text-[clamp(28px,7vw,40px)] leading-[1.1] outline-none bajo:mt-3 bajo:text-[26px]"
          >
            Leyendo tu carta…
          </h1>
          <p className="mt-3 text-lg text-(--text-secondary) bajo:text-base">
            Suele tardar entre medio minuto y dos minutos. No cierres la
            página.
          </p>
        </div>
      )}

      {pantalla.tipo === "falta-fecha" && (
        <FaltaFecha
          titulo={titulo}
          onSeguir={(fecha) => {
            const carta = pendiente.current;
            if (carta) leerArchivo(carta, fecha);
            else
              setPantalla({
                tipo: "resultado",
                resultado: ejemploPorDefecto,
                pagina: 0,
              });
          }}
          onVolver={inicio}
        />
      )}

      {pantalla.tipo === "resultado" && (
        <PaginasResultado
          resultado={pantalla.resultado}
          pagina={pantalla.pagina}
          titulo={titulo}
          irA={(pagina) => setPantalla({ ...pantalla, pagina })}
          onTerminar={inicio}
        />
      )}
    </div>
  );
}

// Una pantalla: el contenido arriba y los botones abajo, al alcance del pulgar.
// Si en un móvil muy pequeño no cabe, solo se desplaza el contenido.
function Vista({
  cuerpo,
  acciones,
}: {
  cuerpo: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-6 pb-4 bajo:pt-3">
        {cuerpo}
      </div>
      <div className="grid shrink-0 gap-3 pb-4 bajo:gap-2 bajo:pb-2">
        {acciones}
      </div>
    </>
  );
}

// contexto.md 6.2.2: sin fecha de notificación no hay fecha límite. Se pide.
function FaltaFecha({
  titulo,
  onSeguir,
  onVolver,
}: {
  titulo: React.RefObject<HTMLHeadingElement | null>;
  onSeguir: (fecha: string) => void;
  onVolver: () => void;
}) {
  const [fecha, setFecha] = useState("");
  return (
    <Vista
      cuerpo={
        <>
          <h1
            ref={titulo}
            tabIndex={-1}
            className="text-[clamp(28px,7vw,40px)] leading-[1.1] outline-none bajo:text-[26px]"
          >
            ¿Qué día te llegó la carta?
          </h1>
          <p className="mt-3 text-lg text-(--text-secondary) bajo:text-base">
            La carta no lo dice, y sin ese día no podemos calcular hasta cuándo
            tienes.
          </p>
          <label
            htmlFor="fecha"
            className="mt-6 text-base font-medium bajo:mt-3"
          >
            Día en que la recibiste
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-2 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-4 text-base text-(--text-secondary) bajo:mt-2">
            Mira el sello de Correos o el aviso de la notificación electrónica.
            El día del SMS o del email de aviso no vale.
          </p>
        </>
      }
      acciones={
        <>
          <Button
            variant="sunset"
            className={grande}
            disabled={!fecha}
            onClick={() => onSeguir(fecha)}
          >
            Seguir
          </Button>
          <Button variant="outline" className={grande} onClick={onVolver}>
            No lo sé, empezar de nuevo
          </Button>
        </>
      }
    />
  );
}

function PaginasResultado({
  resultado: r,
  pagina,
  titulo,
  irA,
  onTerminar,
}: {
  resultado: Resultado;
  pagina: number;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  irA: (pagina: number) => void;
  onTerminar: () => void;
}) {
  // Lo marcado vive solo en memoria mientras se ve el resultado.
  const [hechos, setHechos] = useState<boolean[]>([]);
  const grupos = Array.from({ length: Math.ceil(r.pasos.length / 3) }, (_, g) =>
    r.pasos.slice(g * 3, g * 3 + 3),
  );

  const h1 = (texto: string) => (
    <h1
      ref={titulo}
      tabIndex={-1}
      className="text-[clamp(26px,6.5vw,38px)] leading-[1.12] tracking-[-0.01em] outline-none bajo:text-[26px]"
    >
      {texto}
    </h1>
  );

  const paginas: { cuerpo: ReactNode; sedeEsPrincipal?: boolean }[] = [
    {
      cuerpo: (
        <>
          <p className="font-mono text-sm tracking-[0.06em] text-(--text-secondary) uppercase">
            {r.emisor}
          </p>
          <div className="mt-2">{h1(r.titular)}</div>
          <Badge
            variant="outline"
            className="mt-3 h-auto self-start py-1 text-sm whitespace-normal"
          >
            {textoCategoria[r.categoria]}
          </Badge>
          <TarjetaPlazo resultado={r} />
        </>
      ),
    },
    {
      cuerpo: (
        <>
          {h1("¿Qué dice la carta?")}
          <p className="mt-4 text-xl leading-[1.5] bajo:mt-2 bajo:text-lg">
            {r.queDice}
          </p>
        </>
      ),
    },
    {
      cuerpo: (
        <>
          {h1("¿Y si no hago nada?")}
          <p className="mt-4 text-xl leading-[1.5] bajo:mt-2 bajo:text-lg">
            {r.consecuencia.claro}
          </p>
          {r.consecuencia.literal && (
            <Card
              render={<section />}
              className="mt-6 shrink-0 gap-2 bg-muted px-5 py-5 text-base ring-0 bajo:mt-3 bajo:py-3"
            >
              <h2 className="font-sans text-sm font-medium text-(--text-secondary)">
                Lo que dice tu carta
              </h2>
              <p className="text-lg bajo:text-base">
                «{r.consecuencia.literal}»
              </p>
            </Card>
          )}
        </>
      ),
    },
    // De 3 en 3 para que cada pantalla quepa sin scroll.
    ...grupos.map((grupo, g) => ({
      cuerpo: (
        <>
          {h1(
            grupos.length > 1
              ? `¿Qué tienes que hacer? (${g + 1} de ${grupos.length})`
              : "¿Qué tienes que hacer?",
          )}
          {g === 0 && (
            <p className="mt-2 text-base text-(--text-secondary)">
              Puedes ir marcando lo que ya has hecho. No se guarda.
            </p>
          )}
          <ol
            start={g * 3 + 1}
            className="mt-5 grid gap-4 bajo:mt-3 bajo:gap-2"
          >
            {grupo.map((paso, j) => {
              const i = g * 3 + j;
              return (
                <li key={paso}>
                  <label className="grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_28px] items-start gap-x-3 text-lg bajo:text-base">
                    <span className="text-[24px] leading-[1.1] font-light text-brand tabular-nums">
                      {i + 1}
                    </span>
                    <span>{paso}</span>
                    <input
                      type="checkbox"
                      checked={hechos[i] ?? false}
                      onChange={(e) =>
                        setHechos((h) => {
                          const n = [...h];
                          n[i] = e.target.checked;
                          return n;
                        })
                      }
                      className="mt-1 size-6 accent-brand"
                    />
                  </label>
                </li>
              );
            })}
          </ol>
        </>
      ),
    })),
    {
      sedeEsPrincipal: !!r.donde.sede,
      cuerpo: (
        <>
          {h1("¿Dónde se hace?")}
          <p className="mt-4 text-lg bajo:mt-2 bajo:text-base">
            {r.donde.texto}
          </p>
          {r.donde.sede && (
            <Card
              render={<section />}
              className="shrink-0 mt-6 gap-3 px-5 py-5 text-base bajo:mt-3 bajo:py-3"
            >
              <p className="text-sm text-(--text-secondary)">Web oficial</p>
              <p className="text-lg leading-[1.35] font-medium bajo:text-base">
                {r.donde.sede.nombre}
              </p>
              <p className="font-mono text-sm text-(--text-secondary) [overflow-wrap:anywhere]">
                {new URL(r.donde.sede.url).hostname}
              </p>
              <a
                href={r.donde.sede.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "sunset" }),
                  grande,
                  "mt-2",
                )}
              >
                Abrir la web oficial <span aria-hidden="true">↗</span>
              </a>
            </Card>
          )}
        </>
      ),
    },
    {
      cuerpo: (
        <>
          {h1("¿De dónde sale la fecha?")}
          {r.plazo.textoLiteral && (
            <blockquote className="mt-4 border-l-4 border-brand pl-4 text-lg bajo:mt-2 bajo:text-base">
              «{r.plazo.textoLiteral}»
            </blockquote>
          )}
          <p className="mt-4 font-mono text-sm bajo:mt-2">{r.plazo.regla}</p>
          <p className="mt-4 text-base text-(--text-secondary) bajo:mt-2">
            Calculado con el calendario nacional y de la Comunitat Valenciana.
            No incluye festivos locales.
          </p>
        </>
      ),
    },
    {
      cuerpo: (
        <>
          {h1("Antes de actuar")}
          <p className="mt-4 text-lg bajo:mt-2 bajo:text-base">
            Esto es orientativo, no es asesoramiento legal. Confírmalo con el
            organismo que te escribe.
          </p>
          <div className="mt-5 bajo:mt-3">
            <Fuentes fuentes={r.fuentes} />
          </div>
        </>
      ),
    },
  ];

  const actual = paginas[pagina];
  const ultima = pagina === paginas.length - 1;

  return (
    <>
      <p className="flex shrink-0 items-center justify-between pt-4 font-mono text-sm tracking-[0.06em] text-(--text-secondary) uppercase">
        <span>
          Paso {pagina + 1} de {paginas.length}
        </span>
        <span aria-hidden="true" className="flex gap-1.5">
          {paginas.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-2 rounded-full",
                i === pagina ? "bg-brand" : "bg-foreground/30",
              )}
            />
          ))}
        </span>
      </p>
      <Vista
        cuerpo={actual.cuerpo}
        acciones={
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <Button
              variant="outline"
              className={grande}
              onClick={() => (pagina === 0 ? onTerminar() : irA(pagina - 1))}
            >
              {pagina === 0 ? "Otra carta" : "Atrás"}
            </Button>
            <Button
              variant={actual.sedeEsPrincipal ? "outline" : "sunset"}
              className={grande}
              onClick={() => (ultima ? onTerminar() : irA(pagina + 1))}
            >
              {ultima ? "Terminar" : "Siguiente"}
            </Button>
          </div>
        }
      />
    </>
  );
}

// La tarjeta del sol de esta vista: la fecha límite (contexto.md 6.1).
function TarjetaPlazo({ resultado: r }: { resultado: Resultado }) {
  const { fechaLimite, estadoCalculo } = r.plazo;
  if (estadoCalculo !== "CALCULADA" || !fechaLimite)
    return (
      <Card
        render={<section />}
        className="shrink-0 mt-6 gap-2 bg-muted px-5 py-5 text-lg ring-0 bajo:mt-3 bajo:text-base bajo:py-3"
      >
        <h2 className="font-sans text-sm font-medium text-(--text-secondary)">
          Plazo
        </h2>
        <p>
          No podemos confirmar la fecha límite. Consúltala en la web del
          organismo que te escribe.
        </p>
      </Card>
    );

  const estado = estadoPlazo(fechaLimite);
  return (
    <>
      <Card
        render={<section />}
        className={cn(
          "mt-6 shrink-0 gap-1 px-5 py-5 ring-0 bajo:mt-3 bajo:py-3",
          sol,
        )}
      >
        <h2 className="font-sans text-sm font-medium">
          {estado.tipo === "vencido"
            ? "El plazo ya terminó"
            : "Tienes hasta el"}
        </h2>
        <p className="font-heading text-[clamp(30px,8vw,44px)] leading-[1.1] first-letter:uppercase bajo:text-[30px]">
          {fechaLarga(fechaLimite)}
        </p>
        {estado.tipo !== "vencido" && (
          <p className="mt-1 text-lg font-medium bajo:text-base">
            {estado.tipo === "en-plazo" &&
              (estado.dias === 1
                ? "Te queda 1 día"
                : `Te quedan ${estado.dias} días`)}
            {estado.tipo === "hoy" && "Hoy es el último día"}
          </p>
        )}
      </Card>
      {estado.tipo === "vencido" && (
        <p className="mt-4 text-lg bajo:mt-2 bajo:text-base">{r.siYaVencio}</p>
      )}
    </>
  );
}
