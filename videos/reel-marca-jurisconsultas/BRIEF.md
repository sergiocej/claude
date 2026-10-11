---
workflow: general-video
flow: companion
storyboard: yes
message: "Un delito digital se resuelve cuando lo penal y lo técnico trabajan juntos, y a tiempo"
destination: instagram-reels
aspect: 1080x1920
language: es-AR
audience: "Personas en San Nicolás y la región que sufrieron un fraude o delito digital y todavía no denunciaron"
length: 55s
angle: "Las dos mitades: la técnica y la penal, en el mismo estudio"
---

## Intent

Reel de marca para @jurisconsultasok, el estudio del Dr. Sergio Iván Cej en San
Nicolás de los Arroyos. Hecho 100 % con código: no hay filmación ni cámara.

El video no vende servicios jurídicos: desarma una creencia. La víctima de un
fraude digital cree que la culpa es suya, se calla, y mientras se calla la
prueba se vence. El giro es que el problema no era la gravedad del hecho sino el
tiempo, y que un delito digital tiene dos mitades que casi siempre se trabajan
por separado.

Tono: fluido, incómodo sin gritar, autoridad implícita. La voz de marca está
definida en la skill `voz-jurisconsultas` y manda sobre cualquier decisión de
copy. El texto corre, no golpea.

## Assets

- ../../index.html — landing del estudio; fuente de la paleta, la tipografía y
  los datos de contacto. Ya extraídos al manual de marca de abajo.
- PENDIENTE — logo en SVG, o PNG de 1000 px o más con fondo transparente. La
  landing no tiene archivo de logo: está armado con texto.

## Manual de marca

| Campo | Valor |
|---|---|
| Nombre | Juris Consultas — Dr. Sergio Iván Cej |
| Qué hacemos | Defensa penal y ciberdelitos, con especialización en cibercrimen y ciberseguridad |
| Fondo oscuro | `#0a0a0a` (apoyos: `#111111`, `#1a1a1a`) |
| Fondo claro | `#f5f5f5` |
| Acento principal | `#C9A84C` dorado (secundario `#e0bc6a`) |
| Color de alerta | PENDIENTE DE APROBACIÓN — propuesta `#8E2A2A` rojo apagado |
| Tipografía de títulos | Montserrat (ya viene en HyperFrames) |
| Tipografía de datos | PENDIENTE DE APROBACIÓN — propuesta JetBrains Mono |
| Tono de voz | Directo, cercano, técnico sin tecnicismos; corrección de percepción |
| Palabras que no usamos | Lenguaje de manual jurídico, de comunicado de prensa, superlativos sobre el estudio |
| Variedad | Español rioplatense, vos |

## Customizations

- Dirección de arte y lenguaje de movimiento según el pedido del usuario:
  tres fondos que alternan por idea, letras que entran con desenfoque en
  sincronía con la voz, círculos que se abren desde un punto, apagado en línea
  horizontal, zoom que atraviesa un objeto, texto que se desarma en partículas
  (canvas, posiciones calculadas sin azar), franjas diagonales en direcciones
  opuestas, mosaico final que se aleja hacia la placa de cierre.
- Interfaz de técnico fija en las esquinas: marcas de esquina, sección arriba a
  la izquierda, `JURIS CONSULTAS · 00:00:00` arriba a la derecha con tiempo
  corriendo, contador de bloque abajo a la derecha, `datos ilustrativos` abajo a
  la izquierda donde corresponda. Cambia de color según el fondo.
- Grano suave y viñeta en todo el video.
- Subtítulos de 2 o 3 palabras con la palabra activa resaltada, solo en los
  bloques donde la pantalla no muestre ya el mismo texto.
- Voz: ElevenLabs, modelo `eleven_multilingual_v2`, endpoint
  `text-to-speech/{voice_id}/with-timestamps` para tener el tiempo de cada
  carácter. `build.mjs` inyecta esos tiempos en cada escena, así un cambio de
  voz re-sincroniza todo. **La cadena ya está armada y probada** con una voz
  local descartable (Kokoro, `ef_dora`): `node build.mjs --elevenlabs` cambia
  la fuente sin tocar ninguna escena.
- CTA de cierre: WhatsApp. Primera orientación confidencial.

## Notes

- **Sin cifras.** La landing no publica ningún número verificable: dice "años de
  ejercicio" sin precisar. Por la regla de no inventar datos, el guion no lleva
  ninguna cifra. Eso deja sin contenido honesto dos técnicas del pedido
  original: el tablero 3D con contadores y los contadores que corren hasta el
  número real. Si el usuario aporta cifras reales se reincorporan; si no, se
  reemplazan por el tratamiento de decaimiento de prueba (bloques 5 y 6).
- **Claim que se dejó afuera a propósito.** La landing afirma que es "uno de los
  pocos profesionales del país con especialización simultánea en Cibercrimen y
  Ciberseguridad". Es un superlativo comparativo no verificable y la publicidad
  de servicios jurídicos está reglamentada por el colegio de abogados. El guion
  enuncia las dos credenciales como hechos y no usa el comparativo.
- **No se citan plazos de conservación de datos.** El bloque 6 habla de que los
  registros se vencen en términos cualitativos. Poner un plazo concreto exige
  verificar la norma primero; sin eso, no va.
- Determinismo obligatorio: nada de `Math.random()`, `Date.now()` ni pedidos de
  red durante el render. Las partículas llevan posiciones calculadas.
- La API key de ElevenLabs va en los secrets del entorno, nunca en un `.env` del
  repo: este proyecto está en un contenedor en la nube y el archivo terminaría
  commiteado.
- Render local verificado en esta máquina: 10 s @ 1920×1080 en 16 s, Chrome
  headless shell instalado. El consumo de la cuenta HyperFrames es desconocido
  (`usage` responde `unsupported_auth`, no hay sesión de HeyGen); no se asume
  disponibilidad.
- Música y efectos de sonido: la librería de HyperFrames pide cuenta de HeyGen.
  Alternativas sin resolver: generarlos con Higgsfield, o MusicGen local.


## Sincronía — cómo funciona

`build.mjs` es el único lugar donde viven los tiempos. Ninguna escena tiene
segundos absolutos escritos a mano: cada una recibe, entre los marcadores
`BEATS-INICIO` / `BEATS-FIN`, cuatro variables que el script reescribe.

| Variable | Qué trae |
|---|---|
| `B[i]` | inicio local del bloque *i* de esa escena |
| `BF[i]` | fin local del bloque *i* |
| `D` | duración de la escena |
| `W[i][j]` | `[inicio, fin]` de la palabra *j* del bloque *i* |

Las entradas importantes están ancladas a **palabras**, no a segundos: el fondo
salta a rojo en la palabra "Es", las dos mitades entran en "técnica" y "penal",
las credenciales puntúan en "porque". Si cambia la voz, eso se mueve solo.

El script también reescribe `index.html`: duración del root, `data-start` y
`data-duration` de las siete escenas, la tabla de bloques del HUD y los cambios
de tinta.

### Cambiar de voz

1. Pedir a ElevenLabs cada bloque por `text-to-speech/{voice_id}/with-timestamps`.
2. Guardar en `audio/elevenlabs.json` con la forma
   `{ bloques: [ { n, duracion, caracteres: [{ c, inicio, fin }] } ] }`.
3. `node build.mjs --elevenlabs`
4. `npx hyperframes check` y renderizar.

Con ElevenLabs los tiempos por palabra son reales. Con la voz local se estiman
repartiendo cada bloque según el largo de sus palabras — buena aproximación,
pero aproximación.

### Verificación de la v2

Detección de silencios sobre el MP4 renderizado contra la tabla de bloques: los
15 bloques caen a **+0,04 s** de lo calculado, con desvío constante y sin
acumulación a lo largo de los 55 s.
