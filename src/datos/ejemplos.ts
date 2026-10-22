import type { Resultado } from "@/lib/resultado";

// Respuestas simuladas mientras no hay backend. Salen de los PDF ficticios de
// datos/documentos/ (01, 02 y 05) y de indice.json.

const ley39 = {
  nombre: "Ley 39/2015, art. 30: cómo se cuentan los plazos",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565",
};
const sedeSepe = {
  nombre: "Sede del SEPE",
  url: "https://sede.sepe.gob.es/portalSede",
};
const sedeAeat = {
  nombre: "Sede de la Agencia Tributaria",
  url: "https://sede.agenciatributaria.gob.es/",
};

const sepe: Resultado = {
  emisor: "Servicio Público de Empleo Estatal (SEPE)",
  tipoActo: "Requerimiento de subsanación",
  titular: "Te faltan papeles en tu solicitud del paro",
  queDice:
    "El SEPE ha revisado tu solicitud del paro y le faltan dos papeles: el certificado de empresa de tu último trabajo y la carta de despido. Tienes que enviarlos para que sigan con tu solicitud.",
  categoria: "PIERDE_DERECHO",
  pasos: [
    "Pide el certificado de empresa a tu último trabajo.",
    "Busca la carta de despido.",
    "Envía los dos papeles al SEPE por internet o en un registro.",
    "Sigue apuntado como demandante de empleo en LABORA.",
  ],
  consecuencia: {
    claro:
      "El SEPE dará por hecho que ya no quieres el paro y cerrará tu solicitud.",
    literal: "si así no lo hiciera, se le tendrá por desistido de su petición",
  },
  donde: {
    texto:
      "Por internet, en «Aportar documentación a un trámite». También en persona, en cualquier registro público.",
    sede: sedeSepe,
  },
  plazo: {
    textoLiteral:
      "se le requiere para que en el plazo de DIEZ DÍAS hábiles aporte la documentación indicada",
    regla:
      "10 días hábiles desde el día siguiente a la notificación · Ley 39/2015, art. 30",
    fechaNotificacion: "2026-10-07",
    fechaLimite: "2026-10-23",
    estadoCalculo: "CALCULADA",
  },
  siYaVencio:
    "Contacta con el SEPE cuanto antes para saber si tu solicitud sigue abierta.",
  confianza: "ALTA",
  fuentes: [ley39, sedeSepe],
};

const aeatPropuesta: Resultado = {
  emisor: "Agencia Tributaria · Delegación Especial de Valencia",
  tipoActo: "Propuesta de liquidación y trámite de alegaciones",
  titular: "Hacienda propone que pagues 1.105,37 € de tu renta de 2024",
  queDice:
    "Hacienda cree que en la renta de 2024 te aplicaste una reducción por alquiler que no te tocaba. Propone que pagues 1.105,37 €. Todavía no tienes que pagar nada.",
  categoria: "ACTUAR_SI_QUIERES",
  pasos: [
    "Lee el motivo que da Hacienda y decide si estás de acuerdo.",
    "Si no lo estás, envía tus alegaciones con los papeles que lo demuestren.",
    "Si estás de acuerdo, no tienes que hacer nada ahora: te llegará la liquidación.",
  ],
  consecuencia: {
    claro:
      "Hacienda decidirá con los datos que tiene y te mandará la cuenta definitiva.",
    literal: "Transcurrido dicho plazo se dictará la liquidación que proceda.",
  },
  donde: {
    texto:
      "Por internet, en la sede de la Agencia Tributaria, con Cl@ve o certificado digital. También en un registro público.",
    sede: sedeAeat,
  },
  plazo: {
    textoLiteral:
      "Dispone de un plazo de DIEZ DÍAS hábiles, contados a partir del día siguiente al de la notificación, para formular las alegaciones",
    regla:
      "10 días hábiles desde el día siguiente a la notificación · Ley 39/2015, art. 30",
    fechaNotificacion: "2026-10-06",
    fechaLimite: "2026-10-22",
    estadoCalculo: "CALCULADA",
  },
  siYaVencio:
    "Ya no puedes presentar alegaciones a esta propuesta. Cuando llegue la liquidación, te dirá cómo recurrirla.",
  confianza: "ALTA",
  fuentes: [ley39, sedeAeat],
};

const aeatRequerimiento: Resultado = {
  emisor: "Agencia Tributaria · Delegación Especial de Valencia",
  tipoActo: "Requerimiento de documentación",
  titular: "Hacienda te pide papeles de tu renta de 2025",
  queDice:
    "Hacienda está revisando tu renta de 2025. Te pide los justificantes de tus donativos (1.250 €) y el contrato y los recibos del alquiler de tu casa.",
  categoria: "HACER",
  pasos: [
    "Reúne los justificantes de los donativos.",
    "Reúne el contrato de alquiler y los recibos pagados.",
    "Envíalos por la sede de la Agencia Tributaria, en «Contestar requerimientos».",
  ],
  consecuencia: {
    claro:
      "Hacienda puede calcular tu renta solo con sus datos. No responder puede contar como infracción grave.",
    literal:
      "de no aportarse la documentación, se podrá dictar liquidación provisional con los datos que obren en poder de la Administración",
  },
  donde: {
    texto:
      "Por internet, en la sede de Hacienda, en «Contestar requerimientos».",
    sede: sedeAeat,
  },
  plazo: {
    textoLiteral:
      "La documentación deberá aportarse en el plazo de DIEZ DÍAS hábiles, contados a partir del día siguiente al de la notificación",
    regla:
      "10 días hábiles desde el día siguiente a la notificación · Ley 39/2015, art. 30",
    fechaNotificacion: "2026-10-02",
    fechaLimite: "2026-10-20",
    estadoCalculo: "CALCULADA",
  },
  siYaVencio:
    "Contacta con Hacienda cuanto antes para saber cómo está tu caso.",
  confianza: "ALTA",
  fuentes: [ley39, sedeAeat],
};

export const ejemplos = [
  { id: "05", etiqueta: "Paro: te faltan papeles (SEPE)", resultado: sepe },
  {
    id: "02",
    etiqueta: "Hacienda: propuesta de pago",
    resultado: aeatPropuesta,
  },
  {
    id: "01",
    etiqueta: "Hacienda: te pide papeles",
    resultado: aeatRequerimiento,
  },
] as const;

// Mock: reconoce los PDF del pack por su número; el resto pide la fecha.
export const ejemploPorArchivo = (nombre: string) =>
  ejemplos.find((e) => nombre.startsWith(e.id))?.resultado ?? null;

export const ejemploPorDefecto = sepe;
