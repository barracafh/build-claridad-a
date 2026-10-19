# Track 2 · Traductor de documentos

## El reto

Le pasas el PDF o la notificación de turno y te lo traduce a lenguaje humano, con un checklist de qué tienes que hacer y para cuándo. **Sin guardar nada.**

Puede haber hasta dos squads en este track, los dos con el mismo reto. Cada uno construye las piezas que le dé tiempo, en el orden de abajo.

## Qué se espera en la demo

Subir uno de los documentos de prueba y obtener: qué dice (en pocas frases y sin jerga), qué hay que hacer y la fecha límite, junto con lo que pasa si no se hace nada.

## Piezas

El reto se puede abordar por partes. Haced las que os dé tiempo. Empezad por «Del PDF a la checklist»: «De la foto a la checklist» reutiliza la misma salida.

| Pieza                     | Alcance en unas 4 h                                                                                                 | Hecho cuando…                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Del PDF a la checklist    | Leer los PDF ficticios del pack y devolver qué dicen, qué hay que hacer y para cuándo.                              | Acierta la fecha límite de `indice.json` en los nueve documentos y muestra la frase original de la que sale cada plazo.                    |
| De la foto a la checklist | Lo mismo a partir de la foto de móvil y del documento en valenciano, respondiendo en el idioma que pida la persona. | Lee la foto (03b) y el documento 06 con la misma salida que un PDF; avisa si el documento se envía a un proveedor de LLM y no guarda nada. |

## Materiales (`datos/`)

Nueve notificaciones **ficticias**, con marca de agua y datos inventados, que imitan documentos reales, más una foto de móvil para probar la lectura de imágenes:

| Archivo                                              | Tipo                                                 | Plazo                                  | Fecha límite esperada |
| ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | --------------------- |
| 01-aeat-requerimiento-irpf.pdf                       | Requerimiento de documentación (AEAT)                | 10 días hábiles                        | 2026-10-20            |
| 02-aeat-propuesta-liquidacion.pdf                    | Propuesta de liquidación y alegaciones (AEAT)        | 10 días hábiles                        | 2026-10-22            |
| 03-dgt-denuncia-velocidad.pdf · 03b-…-foto-movil.jpg | Multa de tráfico (DGT)                               | 20 días naturales                      | 2026-10-28            |
| 04-aeat-providencia-apremio.pdf                      | Providencia de apremio (AEAT)                        | art. 62.5 LGT                          | 2026-10-20            |
| 05-sepe-requerimiento-prestacion.pdf                 | Subsanación de la solicitud de paro (SEPE)           | 10 días hábiles                        | 2026-10-23            |
| 06-gva-rvi-denegacion-valencia.pdf                   | Denegación de la Renta Valenciana, **en valenciano** | Recurso de alzada, 1 mes               | 2026-11-09            |
| 07-ajuntament-baja-padron.pdf                        | Audiencia por baja en el padrón (Ajuntament)         | 15 días hábiles                        | 2026-10-26            |
| 08-jez-miembro-mesa-29N.pdf                          | Designación como miembro de mesa el 29-N             | 7 días (naturales, plazos electorales) | 2026-11-10            |
| 09-inss-imv-requerimiento.pdf                        | Requerimiento del Ingreso Mínimo Vital (INSS)        | 10 días hábiles                        | 2026-10-21            |

`indice.json` recoge esta misma información en formato máquina, para usarla como batería de pruebas.

`festivos-2026.json` trae los 14 festivos de 2026 en València ciudad (nacionales, de la Comunitat Valenciana y locales), cada uno con su fuente en el BOE o el DOGV. Las fechas esperadas se han calculado con ellos: entre octubre y noviembre solo cuentan el 9/10 y el 12/10. Son material de prueba, no asesoramiento legal.

## Referencias

- **Cómputo de plazos:** Ley 39/2015, art. 30.
  - Los días hábiles excluyen sábados, domingos y festivos.
  - Los plazos en meses vencen el mismo día del mes siguiente.
  - Si el último día es inhábil, el plazo pasa al siguiente día hábil.
- **Plazos electorales (documento 08):** son siempre naturales e improrrogables, aunque el escrito diga solo «días» (LOREG art. 119).
- **Lectura Fácil:** norma UNE 153101:2018 EX, para el criterio de «lenguaje humano».

## A tener en cuenta

- El error más grave es calcular mal un plazo (hábiles frente a naturales, o festivos locales). Conviene mostrar siempre la frase original del documento de la que sale cada plazo.
- «Sin guardar nada»: ni el archivo ni su contenido se almacenan ni se registran. Hay que avisar al usuario si el documento se envía a un proveedor de LLM.
- En la demo, solo los documentos ficticios de `datos/`. Nunca documentos reales de personas.
- Cada fecha es un cálculo orientativo, no asesoramiento legal: la herramienta muestra la regla aplicada (por ejemplo, «10 días hábiles, Ley 39/2015 art. 30») y remite al órgano emisor o a su sede para confirmarla.
- El 22/10 ya habrán vencido los plazos de 01 y 04 (20/10) y de 09 (21/10): la herramienta dice «el plazo venció el …» y qué opciones quedan, sin cuenta atrás negativa.
- Los nueve PDF tienen capa de texto: extraedla en el servidor (por ejemplo, con `bun add unpdf`) y mandad a la IA solo el texto. La foto (03b) necesita un modelo con visión: el del evento, `glm5.3-flash`, la tiene, y `completar()` acepta imágenes (ver `AGENTS.md`).

## Resumen para el agente

```markdown
# Track 2 · Traductor de documentos · Build night · BARRACA x SOTI

Objetivo: a partir de un PDF o una foto de una notificación administrativa, explicar qué dice en lenguaje claro, qué hay que hacer y la fecha límite, y qué pasa si no se hace nada.
Datos de prueba: datos/documentos/ (9 PDF ficticios + 1 foto); datos/documentos/indice.json contiene la fecha límite esperada de cada uno; datos/festivos-2026.json, los festivos de 2026 en València con su fuente.
Reglas: no guardar ni registrar el documento ni su contenido; mostrar el texto original del que sale cada plazo; plazos según la Ley 39/2015, art. 30 (festivos de 2026 en datos/festivos-2026.json), y los electorales, naturales e improrrogables (LOREG art. 119); cada fecha es orientativa, muestra la regla aplicada y remite al órgano emisor; si el plazo ya venció, decirlo; responder en el idioma del documento o en el que pida el usuario; claves solo en servidor; la herramienta se sirve bajo /<equipo> (campo `equipo` de ficha.json) y muestra el aviso "No es un servicio oficial".
```
