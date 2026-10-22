import type { Categoria } from "./resultado";
import type { Lengua } from "./lenguas";

// Los textos de la pantalla en cada lengua oficial. El aviso «Herramienta
// experimental. No es un servicio oficial.» y el botón «¿Algo está mal?
// Avísanos» no están aquí: son textos fijos de la plataforma (reglas 5).
export type Textos = {
  lengua: string;
  titulo: string;
  intro: string;
  arrastrar: string;
  privacidad: string;
  foto: string;
  elegir: string;
  soltar: string;
  confirmarTitulo: string;
  fotoAlt: string;
  si: string;
  no: string;
  leyendoTitulo: string;
  progresoLabel: string;
  subiendo: (porcentaje: number) => string;
  etapas: [string, string, string, string];
  espera: string;
  cancelar: string;
  cancelado: string;
  errorLectura: string;
  errorConexion: string;
  noFormato: (nombre: string) => string;
  muyGrande: (nombre: string) => string;
  fechaTitulo: string;
  fechaIntro: string;
  fechaLabel: string;
  fechaAyuda: string;
  seguir: string;
  noLoSe: string;
  partes: [string, string, string];
  partesLabel: string;
  siguiente: (parte: string) => string;
  otro: string;
  atras: string;
  leerOtro: string;
  queHacerTitulo: string;
  marcar: string;
  sinPasos: string;
  dondeSeHace: string;
  dondeSinSede: string;
  detallesTitulo: string;
  completo: string;
  frasePlazo: string;
  siNoHacesLiteral: string;
  calendario: string;
  orientativo: string;
  siNoHaces: string;
  plazo: string;
  sinFecha: string;
  terminado: string;
  hasta: string;
  queda1: string;
  quedan: (dias: number) => string;
  hoy: string;
  siYaVencio: string;
  fuentes: string;
  categorias: Record<Categoria, string>;
  // «viernes 23 de octubre». Propio y no Intl: los navegadores no traen
  // todas las lenguas (euskera, gallego y aranés fallan en algunos).
  fecha: (iso: string) => string;
};

const partesFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return { dia: new Date(a, m - 1, d).getDay(), n: d, mes: m - 1 };
};
// «d'» delante de vocal (catalán, valenciano y aranés).
const de = (mes: string) =>
  /^[aeiouàèéíòóú]/i.test(mes) ? `d’${mes}` : `de ${mes}`;

const fechaCon =
  (dias: string[], meses: string[], elide = false) =>
  (iso: string) => {
    const { dia, n, mes } = partesFecha(iso);
    return `${dias[dia]} ${n} ${elide ? de(meses[mes]) : `de ${meses[mes]}`}`;
  };

const DIAS_CA = [
  "diumenge",
  "dilluns",
  "dimarts",
  "dimecres",
  "dijous",
  "divendres",
  "dissabte",
];
const MESES_CA = [
  "gener",
  "febrer",
  "març",
  "abril",
  "maig",
  "juny",
  "juliol",
  "agost",
  "setembre",
  "octubre",
  "novembre",
  "desembre",
];

const es: Textos = {
  lengua: "Idioma",
  titulo: "¿Te ha llegado un documento oficial y no sabes qué hacer?",
  intro:
    "Hazle una foto o súbelo en PDF. Te explicamos qué dice, qué tienes que hacer y hasta cuándo.",
  arrastrar: "También puedes arrastrarlo aquí.",
  privacidad:
    "No guardamos tu documento. Para leerlo, se envía a una inteligencia artificial externa y se borra al terminar.",
  foto: "Hacer una foto al documento",
  elegir: "Elegir un PDF o una foto",
  soltar: "Suelta aquí el documento",
  confirmarTitulo: "¿Es este el documento?",
  fotoAlt: "Foto del documento que has elegido",
  si: "Sí, explícamelo",
  no: "No, elegir otro",
  leyendoTitulo: "Leyendo tu documento…",
  progresoLabel: "Progreso de la lectura",
  subiendo: (p) => `Subiendo tu documento (${p} %)`,
  etapas: [
    "Leyendo el texto del documento",
    "Buscando qué te piden y el plazo",
    "Preparando tu resumen",
    "Está tardando más de lo normal. Sigue esperando",
  ],
  espera:
    "Suele tardar entre medio minuto y dos minutos. No cierres la página.",
  cancelar: "Cancelar",
  cancelado: "Has cancelado la lectura. No se ha guardado nada.",
  errorLectura:
    "No se ha podido leer tu documento ahora mismo. Prueba otra vez en unos segundos.",
  errorConexion:
    "No se ha podido leer tu documento ahora mismo. Comprueba tu conexión y prueba otra vez.",
  noFormato: (n) =>
    `«${n}» no es un PDF ni una foto JPG o PNG. Prueba con el documento en PDF o con una foto.`,
  muyGrande: (n) =>
    `«${n}» es demasiado grande (más de 4 MB). Baja su tamaño o calidad y vuelve a intentarlo.`,
  fechaTitulo: "¿Qué día te llegó el documento?",
  fechaIntro:
    "El documento no lo dice, y sin ese día no podemos calcular hasta cuándo tienes.",
  fechaLabel: "Día en que lo recibiste",
  fechaAyuda:
    "Mira el sello de Correos o el aviso de la notificación electrónica. El día del SMS o del email de aviso no vale.",
  seguir: "Seguir",
  noLoSe: "No lo sé, empezar de nuevo",
  partes: ["Resumen", "Qué hacer", "Detalles"],
  partesLabel: "Partes del resultado",
  siguiente: (p) => `Siguiente: ${p}`,
  otro: "Otro documento",
  atras: "Atrás",
  leerOtro: "Leer otro documento",
  queHacerTitulo: "¿Qué tienes que hacer?",
  marcar: "Márcalos según los hagas. No se guarda.",
  sinPasos:
    "No hemos podido sacar los pasos de este documento. Mira el resumen en «Detalles» y confírmalo con el organismo que te escribe.",
  dondeSeHace: "Dónde se hace",
  dondeSinSede:
    "Confírmalo en la web o en la sede del organismo que te escribe.",
  detallesTitulo: "De dónde sale todo esto",
  completo: "Qué dice el documento, completo",
  frasePlazo: "La frase del plazo",
  siNoHacesLiteral: "Lo que pasa si no haces nada",
  calendario:
    "Calculado con el calendario nacional y de la Comunitat Valenciana. No incluye festivos locales.",
  orientativo:
    "Orientativo, no es asesoramiento legal. Confírmalo con quien te escribe.",
  siNoHaces: "Si no haces nada: ",
  plazo: "Plazo",
  sinFecha:
    "No podemos confirmar la fecha límite. Consúltala en la web del organismo que te escribe.",
  terminado: "El plazo ya terminó",
  hasta: "Tienes hasta el",
  queda1: "Te queda 1 día",
  quedan: (n) => `Te quedan ${n} días`,
  hoy: "Hoy es el último día",
  siYaVencio: "Consulta al organismo que te escribe qué opciones te quedan.",
  fuentes: "Fuentes oficiales",
  categorias: {
    PIERDE_DERECHO: "Si no haces nada, pierdes un derecho",
    SANCION: "Te sancionan o te abren un expediente",
    PAGAR: "Tienes que pagar",
    HACER: "Tienes que hacer algo",
    ACTUAR_SI_QUIERES: "Puedes responder si no estás de acuerdo",
    INFORMA: "Solo te informa",
  },
  fecha: fechaCon(
    ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
  ),
};

const ca: Textos = {
  lengua: "Llengua",
  titulo: "T'ha arribat un document oficial i no saps què fer?",
  intro:
    "Fes-li una foto o puja'l en PDF. T'expliquem què diu, què has de fer i fins quan.",
  arrastrar: "També el pots arrossegar aquí.",
  privacidad:
    "No guardem el teu document. Per llegir-lo, s'envia a una intel·ligència artificial externa i s'esborra en acabar.",
  foto: "Fer una foto al document",
  elegir: "Triar un PDF o una foto",
  soltar: "Deixa anar el document aquí",
  confirmarTitulo: "És aquest el document?",
  fotoAlt: "Foto del document que has triat",
  si: "Sí, explica-me'l",
  no: "No, triar-ne un altre",
  leyendoTitulo: "Llegint el teu document…",
  progresoLabel: "Progrés de la lectura",
  subiendo: (p) => `Pujant el teu document (${p} %)`,
  etapas: [
    "Llegint el text del document",
    "Buscant què et demanen i el termini",
    "Preparant el teu resum",
    "Està trigant més del normal. Continua esperant",
  ],
  espera: "Sol trigar entre mig minut i dos minuts. No tanquis la pàgina.",
  cancelar: "Cancel·lar",
  cancelado: "Has cancel·lat la lectura. No s'ha guardat res.",
  errorLectura:
    "Ara mateix no s'ha pogut llegir el teu document. Torna-ho a provar d'aquí a uns segons.",
  errorConexion:
    "Ara mateix no s'ha pogut llegir el teu document. Comprova la connexió i torna-ho a provar.",
  noFormato: (n) =>
    `«${n}» no és un PDF ni una foto JPG o PNG. Prova amb el document en PDF o amb una foto.`,
  muyGrande: (n) =>
    `«${n}» és massa gran (més de 4 MB). Redueix-ne la mida o la qualitat i torna-ho a provar.`,
  fechaTitulo: "Quin dia et va arribar el document?",
  fechaIntro:
    "El document no ho diu, i sense aquest dia no podem calcular fins quan tens.",
  fechaLabel: "Dia en què el vas rebre",
  fechaAyuda:
    "Mira el segell de Correus o l'avís de la notificació electrònica. El dia de l'SMS o del correu d'avís no val.",
  seguir: "Continuar",
  noLoSe: "No ho sé, tornar a començar",
  partes: ["Resum", "Què fer", "Detalls"],
  partesLabel: "Parts del resultat",
  siguiente: (p) => `Següent: ${p}`,
  otro: "Un altre document",
  atras: "Enrere",
  leerOtro: "Llegir un altre document",
  queHacerTitulo: "Què has de fer?",
  marcar: "Marca'ls a mesura que els facis. No es guarda.",
  sinPasos:
    "No hem pogut treure els passos d'aquest document. Mira el resum a «Detalls» i confirma-ho amb l'organisme que t'escriu.",
  dondeSeHace: "On es fa",
  dondeSinSede: "Confirma-ho al web o a la seu de l'organisme que t'escriu.",
  detallesTitulo: "D'on surt tot això",
  completo: "Què diu el document, sencer",
  frasePlazo: "La frase del termini",
  siNoHacesLiteral: "Què passa si no fas res",
  calendario:
    "Calculat amb el calendari estatal i de la Comunitat Valenciana. No inclou festius locals.",
  orientativo:
    "Orientatiu, no és assessorament legal. Confirma-ho amb qui t'escriu.",
  siNoHaces: "Si no fas res: ",
  plazo: "Termini",
  sinFecha:
    "No podem confirmar la data límit. Consulta-la al web de l'organisme que t'escriu.",
  terminado: "El termini ja s'ha acabat",
  hasta: "Tens fins al",
  queda1: "Et queda 1 dia",
  quedan: (n) => `Et queden ${n} dies`,
  hoy: "Avui és l'últim dia",
  siYaVencio: "Consulta a l'organisme que t'escriu quines opcions et queden.",
  fuentes: "Fonts oficials",
  categorias: {
    PIERDE_DERECHO: "Si no fas res, perds un dret",
    SANCION: "Et sancionen o t'obren un expedient",
    PAGAR: "Has de pagar",
    HACER: "Has de fer alguna cosa",
    ACTUAR_SI_QUIERES: "Pots respondre si no hi estàs d'acord",
    INFORMA: "Només t'informa",
  },
  fecha: fechaCon(DIAS_CA, MESES_CA, true),
};

const va: Textos = {
  ...ca,
  arrastrar: "També el pots arrossegar ací.",
  privacidad:
    "No guardem el teu document. Per a llegir-lo, s'envia a una intel·ligència artificial externa i s'esborra en acabar.",
  soltar: "Solta ací el document",
  confirmarTitulo: "És este el document?",
  etapas: [
    "Llegint el text del document",
    "Buscant què et demanen i el termini",
    "Preparant el teu resum",
    "Està tardant més del normal. Continua esperant",
  ],
  espera: "Sol tardar entre mig minut i dos minuts. No tanques la pàgina.",
  errorLectura:
    "Ara mateix no s'ha pogut llegir el teu document. Torna a provar-ho d'ací a uns segons.",
  errorConexion:
    "Ara mateix no s'ha pogut llegir el teu document. Comprova la connexió i torna a provar-ho.",
  muyGrande: (n) =>
    `«${n}» és massa gran (més de 4 MB). Reduïx-ne la grandària o la qualitat i torna a provar-ho.`,
  fechaIntro:
    "El document no ho diu, i sense eixe dia no podem calcular fins quan tens.",
  atras: "Arrere",
  marcar: "Marca'ls a mesura que els faces. No es guarda.",
  sinPasos:
    "No hem pogut traure els passos d'este document. Mira el resum en «Detalls» i confirma-ho amb l'organisme que t'escriu.",
  dondeSinSede:
    "Confirma-ho en el web o en la seu de l'organisme que t'escriu.",
  detallesTitulo: "D'on ix tot açò",
  sinFecha:
    "No podem confirmar la data límit. Consulta-la en el web de l'organisme que t'escriu.",
  terminado: "El termini ja ha acabat",
  hoy: "Hui és l'últim dia",
};

const eu: Textos = {
  lengua: "Hizkuntza",
  titulo: "Agiri ofizial bat iritsi zaizu eta ez dakizu zer egin?",
  intro:
    "Atera argazki bat edo igo PDFan. Zer dioen, zer egin behar duzun eta noiz arte azalduko dizugu.",
  arrastrar: "Hona ere arrasta dezakezu.",
  privacidad:
    "Ez dugu zure agiria gordetzen. Irakurtzeko, kanpoko adimen artifizial batera bidaltzen da eta amaitzean ezabatzen da.",
  foto: "Atera argazki bat agiriari",
  elegir: "Aukeratu PDF bat edo argazki bat",
  soltar: "Askatu agiria hemen",
  confirmarTitulo: "Hau al da agiria?",
  fotoAlt: "Aukeratu duzun agiriaren argazkia",
  si: "Bai, azaldu iezadazu",
  no: "Ez, beste bat aukeratu",
  leyendoTitulo: "Zure agiria irakurtzen…",
  progresoLabel: "Irakurketaren aurrerapena",
  subiendo: (p) => `Zure agiria igotzen (% ${p})`,
  etapas: [
    "Agiriaren testua irakurtzen",
    "Zer eskatzen dizuten eta epea bilatzen",
    "Zure laburpena prestatzen",
    "Ohi baino gehiago ari da luzatzen. Itxaron pixka bat gehiago",
  ],
  espera:
    "Normalean minutu erdi eta bi minutu artean behar ditu. Ez itxi orria.",
  cancelar: "Utzi",
  cancelado: "Irakurketa bertan behera utzi duzu. Ez da ezer gorde.",
  errorLectura:
    "Ezin izan da zure agiria irakurri oraintxe. Saiatu berriro segundo batzuk barru.",
  errorConexion:
    "Ezin izan da zure agiria irakurri oraintxe. Egiaztatu konexioa eta saiatu berriro.",
  noFormato: (n) =>
    `«${n}» ez da PDF bat, ezta JPG edo PNG argazki bat ere. Saiatu agiria PDFan edo argazki batekin.`,
  muyGrande: (n) =>
    `«${n}» handiegia da (4 MB baino gehiago). Txikitu tamaina edo kalitatea eta saiatu berriro.`,
  fechaTitulo: "Zein egunetan iritsi zitzaizun agiria?",
  fechaIntro:
    "Agiriak ez du esaten, eta egun hori gabe ezin dugu kalkulatu noiz arte duzun.",
  fechaLabel: "Jaso zenuen eguna",
  fechaAyuda:
    "Begiratu Correosen zigilua edo jakinarazpen elektronikoaren abisua. SMSaren edo abisu-mezuaren eguna ez da baliagarria.",
  seguir: "Jarraitu",
  noLoSe: "Ez dakit, hasi berriro",
  partes: ["Laburpena", "Zer egin", "Xehetasunak"],
  partesLabel: "Emaitzaren atalak",
  siguiente: (p) => `Hurrengoa: ${p}`,
  otro: "Beste agiri bat",
  atras: "Atzera",
  leerOtro: "Irakurri beste agiri bat",
  queHacerTitulo: "Zer egin behar duzu?",
  marcar: "Markatu egin ahala. Ez da gordetzen.",
  sinPasos:
    "Ezin izan ditugu agiri honen urratsak atera. Begiratu laburpena «Xehetasunak» atalean eta berretsi idazten dizun erakundearekin.",
  dondeSeHace: "Non egiten da",
  dondeSinSede: "Berretsi idazten dizun erakundearen webgunean edo egoitzan.",
  detallesTitulo: "Nondik dator hau guztia",
  completo: "Agiriak dioena, osorik",
  frasePlazo: "Epearen esaldia",
  siNoHacesLiteral: "Zer gertatzen da ezer egiten ez baduzu",
  calendario:
    "Estatuko eta Valentziako Erkidegoko egutegiarekin kalkulatua. Ez ditu tokiko jaiegunak barne hartzen.",
  orientativo:
    "Orientagarria da, ez aholkularitza juridikoa. Berretsi idazten dizunarekin.",
  siNoHaces: "Ezer egiten ez baduzu: ",
  plazo: "Epea",
  sinFecha:
    "Ezin dugu azken eguna berretsi. Kontsultatu idazten dizun erakundearen webgunean.",
  terminado: "Epea amaitu da",
  hasta: "Azken eguna:",
  queda1: "Egun 1 geratzen zaizu",
  quedan: (n) => `${n} egun geratzen zaizkizu`,
  hoy: "Gaur da azken eguna",
  siYaVencio: "Galdetu idazten dizun erakundeari zer aukera dituzun.",
  fuentes: "Iturri ofizialak",
  categorias: {
    PIERDE_DERECHO: "Ezer egiten ez baduzu, eskubide bat galtzen duzu",
    SANCION: "Zigortu egiten zaituzte edo espediente bat irekitzen dizute",
    PAGAR: "Ordaindu egin behar duzu",
    HACER: "Zerbait egin behar duzu",
    ACTUAR_SI_QUIERES: "Erantzun dezakezu ados ez bazaude",
    INFORMA: "Informatu besterik ez dizu egiten",
  },
  // «urriaren 23a, ostirala»
  fecha: (iso) => {
    const { dia, n, mes } = partesFecha(iso);
    const dias = [
      "igandea",
      "astelehena",
      "asteartea",
      "asteazkena",
      "osteguna",
      "ostirala",
      "larunbata",
    ];
    const meses = [
      "urtarrilaren",
      "otsailaren",
      "martxoaren",
      "apirilaren",
      "maiatzaren",
      "ekainaren",
      "uztailaren",
      "abuztuaren",
      "irailaren",
      "urriaren",
      "azaroaren",
      "abenduaren",
    ];
    return `${meses[mes]} ${n}a, ${dias[dia]}`;
  },
};

const gl: Textos = {
  lengua: "Lingua",
  titulo: "Chegouche un documento oficial e non sabes que facer?",
  intro:
    "Faille unha foto ou súbeo en PDF. Explicámosche que di, que tes que facer e ata cando.",
  arrastrar: "Tamén podes arrastralo aquí.",
  privacidad:
    "Non gardamos o teu documento. Para lelo, envíase a unha intelixencia artificial externa e bórrase ao rematar.",
  foto: "Facer unha foto ao documento",
  elegir: "Escoller un PDF ou unha foto",
  soltar: "Solta aquí o documento",
  confirmarTitulo: "É este o documento?",
  fotoAlt: "Foto do documento que escolliches",
  si: "Si, explícamo",
  no: "Non, escoller outro",
  leyendoTitulo: "Lendo o teu documento…",
  progresoLabel: "Progreso da lectura",
  subiendo: (p) => `Subindo o teu documento (${p} %)`,
  etapas: [
    "Lendo o texto do documento",
    "Buscando que che piden e o prazo",
    "Preparando o teu resumo",
    "Está tardando máis do normal. Segue esperando",
  ],
  espera:
    "Adoita tardar entre medio minuto e dous minutos. Non peches a páxina.",
  cancelar: "Cancelar",
  cancelado: "Cancelaches a lectura. Non se gardou nada.",
  errorLectura:
    "Agora mesmo non se puido ler o teu documento. Proba outra vez nuns segundos.",
  errorConexion:
    "Agora mesmo non se puido ler o teu documento. Comproba a túa conexión e proba outra vez.",
  noFormato: (n) =>
    `«${n}» non é un PDF nin unha foto JPG ou PNG. Proba co documento en PDF ou cunha foto.`,
  muyGrande: (n) =>
    `«${n}» é demasiado grande (máis de 4 MB). Reduce o seu tamaño ou calidade e volve intentalo.`,
  fechaTitulo: "Que día che chegou o documento?",
  fechaIntro:
    "O documento non o di, e sen ese día non podemos calcular ata cando tes.",
  fechaLabel: "Día en que o recibiches",
  fechaAyuda:
    "Mira o selo de Correos ou o aviso da notificación electrónica. O día do SMS ou do correo de aviso non vale.",
  seguir: "Seguir",
  noLoSe: "Non o sei, comezar de novo",
  partes: ["Resumo", "Que facer", "Detalles"],
  partesLabel: "Partes do resultado",
  siguiente: (p) => `Seguinte: ${p}`,
  otro: "Outro documento",
  atras: "Atrás",
  leerOtro: "Ler outro documento",
  queHacerTitulo: "Que tes que facer?",
  marcar: "Márcaos segundo os fagas. Non se garda.",
  sinPasos:
    "Non puidemos sacar os pasos deste documento. Mira o resumo en «Detalles» e confírmao co organismo que che escribe.",
  dondeSeHace: "Onde se fai",
  dondeSinSede: "Confírmao na web ou na sede do organismo que che escribe.",
  detallesTitulo: "De onde sae todo isto",
  completo: "O que di o documento, completo",
  frasePlazo: "A frase do prazo",
  siNoHacesLiteral: "O que pasa se non fas nada",
  calendario:
    "Calculado co calendario estatal e da Comunitat Valenciana. Non inclúe festivos locais.",
  orientativo:
    "Orientativo, non é asesoramento legal. Confírmao con quen che escribe.",
  siNoHaces: "Se non fas nada: ",
  plazo: "Prazo",
  sinFecha:
    "Non podemos confirmar a data límite. Consúltaa na web do organismo que che escribe.",
  terminado: "O prazo xa rematou",
  hasta: "Tes ata o",
  queda1: "Quédache 1 día",
  quedan: (n) => `Quédanche ${n} días`,
  hoy: "Hoxe é o último día",
  siYaVencio: "Consulta ao organismo que che escribe que opcións che quedan.",
  fuentes: "Fontes oficiais",
  categorias: {
    PIERDE_DERECHO: "Se non fas nada, perdes un dereito",
    SANCION: "Sancionante ou ábrenche un expediente",
    PAGAR: "Tes que pagar",
    HACER: "Tes que facer algo",
    ACTUAR_SI_QUIERES: "Podes responder se non estás de acordo",
    INFORMA: "Só te informa",
  },
  fecha: fechaCon(
    ["domingo", "luns", "martes", "mércores", "xoves", "venres", "sábado"],
    [
      "xaneiro",
      "febreiro",
      "marzo",
      "abril",
      "maio",
      "xuño",
      "xullo",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "decembro",
    ],
  ),
};

// Aranés (occitano del Valle de Arán): pendiente de revisión por un hablante.
const oc: Textos = {
  lengua: "Lengua",
  titulo: "T'a arribat un document oficiau e non sabes qué hèr?",
  intro:
    "Hè-li ua fòto o puja-lo en PDF. T'expliquem qué ditz, qué as de hèr e enquia quan.",
  arrastrar: "Tanben lo pòs arrossegar aciu.",
  privacidad:
    "Non guardam eth tòn document. Entà liéger-lo, s'envie a ua intelligéncia artificiau extèrna e s'escafe en acabar.",
  foto: "Hèr ua fòto ath document",
  elegir: "Causir un PDF o ua fòto",
  soltar: "Dèisha anar eth document aciu",
  confirmarTitulo: "Ei aguest eth document?",
  fotoAlt: "Fòto deth document que as causit",
  si: "Òc, explica-me'u",
  no: "Non, causir-ne un aute",
  leyendoTitulo: "Liegent eth tòn document…",
  progresoLabel: "Progrès dera lectura",
  subiendo: (p) => `Pujant eth tòn document (${p} %)`,
  etapas: [
    "Liegent eth tèxte deth document",
    "Cercant qué te demanen e eth tèrme",
    "Preparant eth tòn resumit",
    "Tarde mès deth normau. Contunha demorant",
  ],
  espera: "Sòl tardar entre miei minut e dus minuts. Non barres era pagina.",
  cancelar: "Anullar",
  cancelado: "As anullat era lectura. Non s'a guardat arren.",
  errorLectura:
    "Ara madeish non s'a pogut liéger eth tòn document. Torna-i a ensajar en uns segondi.",
  errorConexion:
    "Ara madeish non s'a pogut liéger eth tòn document. Comprove era connexion e torna-i a ensajar.",
  noFormato: (n) =>
    `«${n}» non ei un PDF ne ua fòto JPG o PNG. Ensaja damb eth document en PDF o damb ua fòto.`,
  muyGrande: (n) =>
    `«${n}» ei massa gran (mès de 4 MB). Redusís era sua mida o qualitat e torna-i a ensajar.`,
  fechaTitulo: "Quin dia t'arribèc eth document?",
  fechaIntro:
    "Eth document non ac ditz, e sense aguest dia non podem calcular enquia quan as.",
  fechaLabel: "Dia que lo receberes",
  fechaAyuda:
    "Guarda eth sagèth de Corrèus o er avís dera notificacion electronica. Eth dia der SMS o deth corrèu d'avís non vau.",
  seguir: "Contunhar",
  noLoSe: "Non ac sai, tornar a començar",
  partes: ["Resumit", "Qué hèr", "Detalhs"],
  partesLabel: "Parts deth resultat",
  siguiente: (p) => `Seguent: ${p}`,
  otro: "Un aute document",
  atras: "Enrè",
  leerOtro: "Liéger un aute document",
  queHacerTitulo: "Qué as de hèr?",
  marcar: "Marca-les a mesura que les hèsques. Non se guarde.",
  sinPasos:
    "Non auem pogut trèir es passi d'aguest document. Guarda eth resumit en «Detalhs» e confirma-ac damb er organisme que t'escriu.",
  dondeSeHace: "A on se hè",
  dondeSinSede: "Confirma-ac ena web o ena sedença der organisme que t'escriu.",
  detallesTitulo: "D'a on ges tot aquerò",
  completo: "Çò que ditz eth document, sancer",
  frasePlazo: "Era frasa deth tèrme",
  siNoHacesLiteral: "Çò que passe se non hès arren",
  calendario:
    "Calculat damb eth calendari der Estat e dera Comunitat Valenciana. Non i son es hèstes locaus.",
  orientativo:
    "Orientatiu, non ei assessorament legau. Confirma-ac damb qui t'escriu.",
  siNoHaces: "Se non hès arren: ",
  plazo: "Tèrme",
  sinFecha:
    "Non podem confirmar era data limit. Consulta-la ena web der organisme que t'escriu.",
  terminado: "Eth tèrme ja s'a acabat",
  hasta: "As enquia eth",
  queda1: "Te demore 1 dia",
  quedan: (n) => `Te demoren ${n} dies`,
  hoy: "Uei ei eth darrèr dia",
  siYaVencio: "Consulta ar organisme que t'escriu quines opcions te demoren.",
  fuentes: "Fonts oficiaus",
  categorias: {
    PIERDE_DERECHO: "Se non hès arren, pèrdes un dret",
    SANCION: "Te sancionen o t'obren un expedient",
    PAGAR: "As de pagar",
    HACER: "As de hèr quauquarren",
    ACTUAR_SI_QUIERES: "Pòs respóner se non i ès d'acòrd",
    INFORMA: "Sonque t'informe",
  },
  fecha: fechaCon(
    [
      "dimenge",
      "deluns",
      "dimars",
      "dimèrcles",
      "dijaus",
      "diuendres",
      "dissabte",
    ],
    [
      "gèr",
      "heruèr",
      "març",
      "abriu",
      "mai",
      "junh",
      "junhsèga",
      "agost",
      "seteme",
      "octobre",
      "noveme",
      "deseme",
    ],
    true,
  ),
};

export const TEXTOS: Record<Lengua["codigo"], Textos> = {
  es,
  ca,
  va,
  eu,
  gl,
  oc,
};
