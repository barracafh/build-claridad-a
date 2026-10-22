"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ChevronDown, FileText, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ruta } from "@/config/sitio";
import type { Lectura } from "@/lib/lectura";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
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
  | { tipo: "confirmar"; archivo: File; vista: string | null }
  | { tipo: "leyendo" }
  | { tipo: "falta-fecha" }
  | { tipo: "resultado"; resultado: Resultado; pagina: number };

// Progreso de la lectura. La subida es real (bytes enviados); lo que tarda el
// servidor no se puede medir, así que esa parte avanza por tiempo estimado.
type Carga =
  { fase: "subiendo"; subida: number } | { fase: "leyendo"; desde: number };

// Límite del servidor (4 MB en la petición): se comprueba antes de subir.
const MAX_BYTES = 4 * 1024 * 1024;
// Lo que suele tardar la IA en leer una carta (medio minuto a dos minutos).
const LECTURA_ESTIMADA_MS = 60_000;

// Botones grandes: se usan con el pulgar y con poca vista.
const grande = "h-14 w-full gap-3 rounded-xl text-lg bajo:h-12 bajo:text-base";
// El sol de la vista, en plano: sin degradado y con texto oscuro (contraste ~12:1).
const sol = "bg-brand-yellow text-foreground";

export function Claridad() {
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "inicio" });
  const [carga, setCarga] = useState<Carga>({ fase: "subiendo", subida: 0 });
  const [aviso, setAviso] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const camara = useRef<HTMLInputElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  // La carta que se está leyendo: hace falta si el servidor pide la fecha
  // de notificación y hay que repetir la lectura con ella.
  const pendiente = useRef<File | null>(null);
  const peticion = useRef<XMLHttpRequest | null>(null);

  // Al cambiar de pantalla, el foco va al titular (lectores de pantalla).
  const clave =
    pantalla.tipo === "resultado"
      ? `resultado-${pantalla.pagina}`
      : pantalla.tipo;
  useEffect(() => {
    titulo.current?.focus();
  }, [clave]);

  function volverConAviso(texto: string) {
    setPantalla({ tipo: "inicio" });
    setAviso(texto);
  }

  // XMLHttpRequest y no fetch: es lo único que informa del progreso de subida.
  function leerArchivo(f: File, fecha?: string) {
    setAviso(null);
    pendiente.current = f;
    setCarga({ fase: "subiendo", subida: 0 });
    setPantalla({ tipo: "leyendo" });

    const datos = new FormData();
    datos.append("documento", f);
    if (fecha) datos.append("fecha", fecha);

    const xhr = new XMLHttpRequest();
    peticion.current = xhr;
    xhr.open("POST", ruta("/api/documento"));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setCarga({ fase: "subiendo", subida: e.loaded / e.total });
    };
    const aLeyendo = () =>
      setCarga((c) =>
        c.fase === "leyendo" ? c : { fase: "leyendo", desde: Date.now() },
      );
    xhr.upload.onload = aLeyendo;
    // Hay navegadores que no informan de la subida de archivos pequeños: si
    // en 1,5 s no llega nada, se pasa igualmente a «leyendo».
    const respaldo = setTimeout(() => {
      setCarga((c) =>
        c.fase === "subiendo" && c.subida === 0
          ? { fase: "leyendo", desde: Date.now() }
          : c,
      );
    }, 1500);
    xhr.onloadend = () => clearTimeout(respaldo);
    xhr.onload = () => {
      peticion.current = null;
      let cuerpo: unknown = null;
      try {
        cuerpo = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300 || !cuerpo) {
        const error = (cuerpo as { error?: string } | null)?.error;
        volverConAviso(
          error ??
            "No se ha podido leer tu carta ahora mismo. Prueba otra vez en unos segundos.",
        );
        return;
      }
      const resultado = deLectura(cuerpo as Lectura);
      if (resultado.plazo.estadoCalculo === "FALTA_FECHA_NOTIFICACION") {
        setPantalla({ tipo: "falta-fecha" });
        return;
      }
      setPantalla({ tipo: "resultado", resultado, pagina: 0 });
    };
    xhr.onerror = () => {
      peticion.current = null;
      volverConAviso(
        "No se ha podido leer tu carta ahora mismo. Comprueba tu conexión y prueba otra vez.",
      );
    };
    xhr.send(datos);
  }

  function cancelar() {
    peticion.current?.abort();
    peticion.current = null;
    volverConAviso("Has cancelado la lectura. No se ha guardado nada.");
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
      f.type ===
        "" /* cámaras que no informan el tipo: lo decide el servidor */ ||
      f.type === "application/pdf" ||
      f.type === "image/jpeg" ||
      f.type === "image/png";
    if (!tipoOk)
      return volverConAviso(
        `«${f.name}» no es un PDF ni una foto JPG o PNG. Prueba con la carta en PDF o con una foto.`,
      );
    if (f.size > MAX_BYTES)
      return volverConAviso(
        `«${f.name}» es demasiado grande (más de 4 MB). Baja su tamaño o calidad y vuelve a intentarlo.`,
      );
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
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;
  const aceptaArchivo =
    pantalla.tipo === "inicio" || pantalla.tipo === "confirmar";
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
            </>
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
        <Vista
          cuerpo={<Progreso carga={carga} titulo={titulo} />}
          acciones={
            <Button variant="outline" className={grande} onClick={cancelar}>
              Cancelar
            </Button>
          }
        />
      )}

      {pantalla.tipo === "falta-fecha" && (
        <FaltaFecha
          titulo={titulo}
          onSeguir={(fecha) => {
            const carta = pendiente.current;
            if (carta) leerArchivo(carta, fecha);
            else inicio();
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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-6 pb-4 select-text bajo:pt-3">
        {cuerpo}
      </div>
      <div className="grid shrink-0 gap-3 pb-4 bajo:gap-2 bajo:pb-2">
        {acciones}
      </div>
    </>
  );
}

// Barra de progreso de subida y lectura. La subida es real; la lectura se
// estima por tiempo y nunca llega al 100 % hasta que responde el servidor.
function Progreso({
  carga,
  titulo,
}: {
  carga: Carga;
  titulo: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  let porcentaje: number;
  let etapa: string;
  if (carga.fase === "subiendo") {
    porcentaje = 2 + 18 * carga.subida;
    etapa = `Subiendo tu carta (${Math.round(carga.subida * 100)} %)`;
  } else {
    const t = Math.max(0, ahora - carga.desde);
    porcentaje = 20 + 75 * (1 - Math.exp(-t / (LECTURA_ESTIMADA_MS / 2.3)));
    etapa =
      t < 10_000
        ? "Leyendo el texto de la carta"
        : t < 35_000
          ? "Buscando qué te piden y el plazo"
          : t < 90_000
            ? "Preparando tu resumen"
            : "Está tardando más de lo normal. Sigue esperando";
  }
  const valor = Math.round(porcentaje);

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h1
        ref={titulo}
        tabIndex={-1}
        className="text-[clamp(28px,7vw,40px)] leading-[1.1] outline-none bajo:text-[26px]"
      >
        Leyendo tu carta…
      </h1>
      <div
        role="progressbar"
        aria-label="Progreso de la lectura"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-valuetext={etapa}
        className="mt-6 h-4 w-full overflow-hidden rounded-full bg-muted ring-1 ring-foreground/20"
      >
        <div
          className="h-full rounded-full bg-foreground motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${valor}%` }}
        />
      </div>
      <p aria-live="polite" className="mt-4 text-lg font-medium bajo:text-base">
        {etapa}
      </p>
      <p className="mt-2 text-base text-(--text-secondary)">
        Suele tardar entre medio minuto y dos minutos. No cierres la página.
      </p>
    </div>
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

const partes = ["Resumen", "Qué hacer", "Detalles"] as const;

// El resultado en tres partes, con pestañas para saltar entre ellas.
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

  const h1 = (texto: string, extra?: string) => (
    <h1
      ref={titulo}
      tabIndex={-1}
      title={extra ? texto : undefined}
      className={cn(
        "text-[clamp(26px,6.5vw,36px)] leading-[1.12] tracking-[-0.01em] outline-none bajo:text-[24px]",
        extra,
      )}
    >
      {texto}
    </h1>
  );

  const cuerpos: ReactNode[] = [
    <>
      {/* Lo primero que se ve es la fecha: el emisor en una línea y el
          titular en tres como mucho (el texto entero está en «Detalles»). */}
      <p
        title={r.emisor}
        className="truncate font-mono text-sm tracking-[0.04em] text-(--text-secondary) uppercase"
      >
        {r.emisor}
      </p>
      <div className="mt-2">{h1(r.titular, "line-clamp-3")}</div>
      <TarjetaPlazo resultado={r} />
      <Badge
        variant="outline"
        className="mt-3 h-auto self-start py-1 text-sm whitespace-normal bajo:mt-2"
      >
        {textoCategoria[r.categoria]}
      </Badge>
      <p className="mt-4 text-lg bajo:mt-2 bajo:text-base">
        <span className="font-medium">Si no haces nada: </span>
        {r.consecuencia.claro}
      </p>
    </>,
    <>
      {h1("¿Qué tienes que hacer?")}
      {r.pasos.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-lg bajo:mt-2 bajo:text-base">
          No hemos podido sacar los pasos de esta carta. Mira el resumen en
          «Detalles» y confírmalo con el organismo que te escribe.
        </p>
      ) : (
        <>
          <p className="mt-1 text-base text-(--text-secondary)">
            Márcalos según los hagas. No se guarda.
          </p>
          {/* El texto queda fuera del checkbox para poder seleccionarlo y copiarlo. */}
          <ol className="mt-4 grid gap-3 bajo:mt-2 bajo:gap-2">
            {r.pasos.map((paso, i) => (
              <li
                key={paso}
                className="grid grid-cols-[24px_minmax(0,1fr)_32px] items-start gap-x-3 text-lg bajo:text-base"
              >
                <span
                  aria-hidden="true"
                  className="text-[22px] leading-[1.15] font-light text-brand tabular-nums"
                >
                  {i + 1}
                </span>
                <span id={`paso-${i}`}>{paso}</span>
                <input
                  type="checkbox"
                  aria-labelledby={`paso-${i}`}
                  checked={hechos[i] ?? false}
                  onChange={(e) =>
                    setHechos((h) => {
                      const n = [...h];
                      n[i] = e.target.checked;
                      return n;
                    })
                  }
                  className="mt-0.5 size-7 cursor-pointer accent-brand"
                />
              </li>
            ))}
          </ol>
        </>
      )}
      {/* Dónde se hace: el enlace a la sede, o el texto si no la hay. */}
      {r.donde.sede ? (
        <a
          href={r.donde.sede.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 h-auto min-h-12 w-full flex-col gap-0 rounded-xl py-2 text-base whitespace-normal bajo:mt-2",
          )}
        >
          <span className="text-sm font-normal text-(--text-secondary)">
            Dónde se hace
          </span>
          <span>
            {r.donde.sede.nombre} <span aria-hidden="true">↗</span>
          </span>
          {/* El dominio real, siempre a la vista. */}
          <span className="font-mono text-sm font-normal text-(--text-secondary)">
            {new URL(r.donde.sede.url).hostname}
          </span>
        </a>
      ) : (
        <p className="mt-4 text-base bajo:mt-2">
          <span className="font-medium">Dónde se hace: </span>
          {r.donde.texto}
        </p>
      )}
    </>,
    <>
      {h1("De dónde sale todo esto")}
      <div className="mt-4 grid gap-2 bajo:mt-2">
        <Desplegable resumen="Qué dice la carta, completo">
          <p>{r.queDice}</p>
        </Desplegable>
        {r.plazo.textoLiteral && (
          <Desplegable resumen="La frase del plazo">
            <blockquote className="border-l-4 border-brand pl-3">
              «{r.plazo.textoLiteral}»
            </blockquote>
            <p className="mt-2 font-mono text-sm">{r.plazo.regla}</p>
            <p className="mt-2 text-(--text-secondary)">
              Calculado con el calendario nacional y de la Comunitat Valenciana.
              No incluye festivos locales.
            </p>
          </Desplegable>
        )}
        {r.consecuencia.literal && (
          <Desplegable resumen="Lo que pasa si no haces nada">
            <p>«{r.consecuencia.literal}»</p>
          </Desplegable>
        )}
      </div>
      <p className="mt-4 text-base text-(--text-secondary) bajo:mt-2">
        Orientativo, no es asesoramiento legal. Confírmalo con quien te escribe.
      </p>
      <div className="mt-4 bajo:mt-2">
        <Fuentes fuentes={r.fuentes} />
      </div>
    </>,
  ];

  const ultima = pagina === cuerpos.length - 1;

  return (
    <>
      <nav
        aria-label="Partes del resultado"
        className="shrink-0 pt-4 bajo:pt-2"
      >
        <ol className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {partes.map((parte, i) => (
            <li key={parte}>
              <button
                type="button"
                aria-current={i === pagina ? "step" : undefined}
                onClick={() => irA(i)}
                className={cn(
                  "h-11 w-full rounded-lg text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 bajo:h-10",
                  i === pagina
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-background",
                )}
              >
                {parte}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <Vista
        cuerpo={cuerpos[pagina]}
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
              variant="sunset"
              className={grande}
              onClick={() => (ultima ? onTerminar() : irA(pagina + 1))}
            >
              {ultima ? "Leer otra carta" : `Siguiente: ${partes[pagina + 1]}`}
            </Button>
          </div>
        }
      />
    </>
  );
}

// Bloque plegable nativo (details/summary): accesible con teclado y lector.
// Comparten nombre para que solo haya uno abierto y la pantalla no crezca.
function Desplegable({
  resumen,
  children,
}: {
  resumen: string;
  children: ReactNode;
}) {
  return (
    <details
      name="detalle"
      className="group rounded-xl ring-1 ring-foreground/15"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {resumen}
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 motion-safe:transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4 text-base">{children}</div>
    </details>
  );
}

// La tarjeta del sol de esta vista: la fecha límite (contexto.md 6.1).
function TarjetaPlazo({ resultado: r }: { resultado: Resultado }) {
  const { fechaLimite, estadoCalculo } = r.plazo;
  if (estadoCalculo !== "CALCULADA" || !fechaLimite)
    return (
      <Card
        render={<section />}
        className="mt-5 shrink-0 gap-2 bg-muted px-5 py-4 text-lg ring-0 bajo:mt-3 bajo:py-3 bajo:text-base"
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
          "mt-5 shrink-0 gap-1 px-5 py-4 ring-0 bajo:mt-3 bajo:py-3",
          sol,
        )}
      >
        <h2 className="font-sans text-sm font-medium">
          {estado.tipo === "vencido"
            ? "El plazo ya terminó"
            : "Tienes hasta el"}
        </h2>
        <p className="font-heading text-[clamp(30px,8vw,42px)] leading-[1.1] first-letter:uppercase bajo:text-[28px]">
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
        <p className="mt-3 text-lg bajo:mt-2 bajo:text-base">{r.siYaVencio}</p>
      )}
    </>
  );
}
