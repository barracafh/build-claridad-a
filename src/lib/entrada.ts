// Validación de la subida, en memoria: tipo por magic bytes, tamaño del body
// y dimensiones de la imagen leídas de las cabeceras JPEG/PNG. Nada toca disco.
export const MAX_BYTES_BODY = 4 * 1024 * 1024;
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
export const MAX_PX = 6000;
export const MAX_PAGINAS = 8;

export type TipoDocumento = "jpeg" | "png" | "pdf";

export function detectarTipo(bytes: Uint8Array): TipoDocumento | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
    return "pdf";
  return null;
}

export function dimensionesImagen(
  bytes: Uint8Array,
  tipo: TipoDocumento,
): { ancho: number; alto: number } | null {
  if (tipo === "png") {
    if (bytes.length < 24) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { ancho: dv.getUint32(16), alto: dv.getUint32(20) };
  }
  if (tipo !== "jpeg") return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marcador = bytes[i + 1];
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marcador === 0xd8 || marcador === 0xd9) {
      i += 2;
      continue;
    }
    const longitud = (bytes[i + 2] << 8) | bytes[i + 3];
    const esSof =
      marcador >= 0xc0 &&
      marcador <= 0xcf &&
      marcador !== 0xc4 &&
      marcador !== 0xc8 &&
      marcador !== 0xcc;
    if (esSof) {
      const alto = (bytes[i + 5] << 8) | bytes[i + 6];
      const ancho = (bytes[i + 7] << 8) | bytes[i + 8];
      return { ancho, alto };
    }
    if (longitud < 2) return null;
    i += 2 + longitud;
  }
  return null;
}

export type EntradaOk = {
  tipo: TipoDocumento;
  dimensiones: { ancho: number; alto: number } | null;
};

export type EntradaMal = { error: string; codigo: "formato" | "tamano" };

export function validarEntrada(
  bytes: Uint8Array,
  mime: string | null,
): EntradaOk | EntradaMal {
  const aceptados = ["image/jpeg", "image/png", "application/pdf"];
  if (mime && !aceptados.includes(mime))
    return {
      error: "Formato no admitido. Sube un PDF o una foto en JPG o PNG.",
      codigo: "formato",
    };
  const tipo = detectarTipo(bytes);
  if (!tipo)
    return {
      error: "Formato no admitido. Sube un PDF o una foto en JPG o PNG.",
      codigo: "formato",
    };
  if (bytes.length > MAX_BYTES_IMAGEN)
    return {
      error: "El archivo pasa de 5 MB. Baja su tamaño o calidad y vuelve a intentarlo.",
      codigo: "tamano",
    };
  if (tipo === "jpeg" || tipo === "png") {
    const dimensiones = dimensionesImagen(bytes, tipo);
    if (
      !dimensiones ||
      dimensiones.ancho > MAX_PX ||
      dimensiones.alto > MAX_PX
    )
      return {
        error: "La imagen pasa de 6000×6000 px. Redúcela y vuelve a intentarlo.",
        codigo: "tamano",
      };
    return { tipo, dimensiones };
  }
  return { tipo, dimensiones: null };
}
