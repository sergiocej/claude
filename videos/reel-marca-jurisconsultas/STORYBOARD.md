---
format: 1080x1920
duration: 56.5s
message: "Un delito digital se resuelve cuando lo penal y lo técnico trabajan juntos, y a tiempo"
arc: Corrección de percepción → Escalada → Punto de quiebre → Giro → Prueba → CTA
audience: "Personas que sufrieron un fraude o delito digital y todavía no denunciaron"
mode: collaborative
---

Los 15 bloques del guion se agrupan en 7 escenas. Las duraciones de abajo son
estimaciones a 2,6 palabras/seg: **la duración real de la voz manda** y se
reinyecta por script cuando llegue el audio de ElevenLabs.

Las siete escenas están construidas y animadas. El corte cae en **56,5 s**
contra los 55 s del brief: 1,5 s de más, dentro del rango de 45 a 60 que se
pidió, y que la voz real va a corregir en cualquier dirección.

Tiempos en el montaje: 1 → 0 s · 2 → 6,5 s · 3 → 14 s · 4 → 21,5 s ·
5 → 31,5 s · 6 → 42,5 s · 7 → 48,5 s.

## Frame 1 — No te hackearon

- scene: Las cinco palabras del gancho entran una por una con desenfoque sobre negro
- duration: 6.5s
- poster: 5s
- transition_in: cut
- status: animated
- voiceover: "No te hackearon. Te eligieron. Alguien miró tu rutina y calculó cuánto podía sacarte."
- src: compositions/01-hook.html
- bloques: 1, 2
- blueprint: kinetic-type-beats
- rules: sine-wave-loop
- registry: blur-in (receta), perspective-marquee (receta), grain-overlay, vignette

Nota de corrección: la cita original decía `waterfall-entry`. Está mal. Esa
regla exige opacidad binaria — "never fade an arrival" — y el brief pide
explícitamente que las letras entren con desenfoque, que es un fundido. Son dos
registros de llegada distintos y mezclarlos rompe los dos. La escena usa la
receta de `blur-in`.

Corrección de percepción, el sello de la voz. "No te hackearon" aterriza solo y
se queda. Después entran las franjas diagonales con la rutina vigilada
(horarios, contactos, movimientos) corriendo en direcciones opuestas, con la
etiqueta `datos ilustrativos`. El HUD aparece acá y no se va más.

## Frame 2 — Vergüenza

- scene: El fondo pasa a rojo en una palabra y la pantalla se apaga en una línea
- duration: 7.5s
- poster: 4s
- transition_in: cut
- status: animated
- voiceover: "Y cuando lo descubrís, lo primero que sentís no es bronca. Es vergüenza. Entonces no lo contás, y esperás."
- src: compositions/02-verguenza.html
- bloques: 3, 4
- blueprint: kinetic-type-beats
- rules: scale-swap-transition, spring-pop-entrance
- registry: grain-overlay, vignette
- hand-authored: apagado de tubo (scaleY a una línea de 2 px)

La consecuencia interna antes que la externa. Esto es lo que separa la pieza de
un reel genérico de abogados: no habla de plata todavía, habla de vergüenza. El
cambio de fondo a `--alert` cae exactamente sobre la palabra. Después la pantalla
se apaga en una línea horizontal, que es de donde nace la escena 3.

El apagado de tubo se escribe a mano: busqué "CRT power off", "screen shutoff
scanline collapse" y "retro monitor" en el catálogo y no hay nada que sirva. Es
un `scaleY` a una línea, trivialmente determinista.

## Frame 3 — La prueba se vence

- scene: Zoom que atraviesa una burbuja de chat y la vuelve una planilla que se desarma en partículas
- duration: 7.5s
- poster: 6s
- transition_in: wipe
- status: animated
- voiceover: "Mientras esperás, la prueba se borra sola. Los registros se vencen, las conversaciones se pierden, el dinero se mueve."
- src: compositions/03-prueba.html
- bloques: 5, 6
- blueprint: camera-journey (sub-forma B, vuelo sin cursor)
- rules: coordinate-target-zoom, particle-burst
- registry: zoom-through-transition, particle-text-dissolve, grain-overlay, vignette

Primera escena en fondo claro. La escalada silenciosa se vuelve literal: el daño
avanza mientras la persona no hace nada. Las filas de la planilla se desarman en
partículas y viajan todas a un punto único — ese punto es el centro del círculo
que se abre en la escena 4, así que las dos escenas comparten coordenada.

Sin plazos de conservación en pantalla: poner un número exige verificar la norma.

## Frame 4 — Hasta que un día

- scene: Quietud total, y el círculo se abre desde el punto de las partículas
- duration: 10s
- poster: 3s
- transition_in: cut
- status: animated
- voiceover: "Hasta que un día te dicen que ya no se puede hacer nada. [silencio 0,6s] Y no es cierto. Llegaste tarde a un sistema que nadie te explicó."
- src: compositions/04-quiebre.html
- bloques: 7, 8
- blueprint: titlecard-reveal
- rules: depth-of-field-blur
- registry: sdf-iris, grain-overlay, vignette

El punto de quiebre y el giro, la bisagra del video. El bloque 7 es casi
inmóvil: tipografía grande y quieta, el reloj del HUD como única cosa que se
mueve. Después el silencio de 0,6 s — el único de la pieza — y sobre "Y no es
cierto" el círculo se abre desde el punto donde cayeron las partículas y trae la
escena siguiente. Es la transición más importante y tiene que ser la más limpia.

## Frame 5 — Las dos mitades

- scene: Dorado a pantalla completa, la pantalla se parte en dos mitades desfasadas que después se encastran
- duration: 11s
- poster: 9s
- transition_in: cut
- status: animated
- voiceover: "Un delito digital tiene dos mitades: la técnica y la penal. Casi siempre se trabajan por separado, y el peritaje llega tarde. Acá se trabajan juntas, porque estudié las dos."
- src: compositions/05-mitades.html
- bloques: 9, 10, 11
- blueprint: comparison-split (adaptado al eje vertical)
- rules: split-tilt-cards, spring-pop-entrance, sine-wave-loop
- registry: grain-overlay, vignette

Nota: el componente `comparison-split` **del registro** no es el blueprint del
mismo nombre. El componente es un wipe de antes/después con divisor; el
blueprint son dos piezas de peso igual que entran desde alas opuestas con
inclinaciones espejadas. Hace falta el segundo. Y como el lienzo es 9:16, la
bisagra del libro se gira 90°: `rotateX` en vez de `rotateY`, entrada desde
arriba y abajo en vez de izquierda y derecha. La firma se conserva.

El golpe de marca: dorado a pantalla completa, texto en oscuro. `TÉCNICA` y
`PENAL` entran desde alas opuestas con inclinaciones espejadas, se separan y se
desfasan en el tiempo mientras habla el bloque 10, y encastran en el 11. Ahí
aparecen las credenciales en mono, como texto en pantalla y no dichas en voz
alta: *Abogado especialista en Derecho Penal · Maestría en Ciberseguridad*.

Se descartó la red de nodos isométrica del pedido original: busqué en el
catálogo y no existe, y hacerla a mano agregaba un elemento que no suma al
mensaje. El desfase de las dos mitades ya dice lo mismo.

## Frame 6 — El tiempo

- scene: El reloj del HUD se agranda hasta el centro y acelera
- duration: 6s
- poster: 4s
- transition_in: cut
- status: animated
- voiceover: "Y eso cambia el tiempo de reacción. En materia penal, el tiempo es casi todo."
- src: compositions/06-tiempo.html
- bloques: 12, 13
- blueprint: kinetic-type-beats
- rules: coordinate-target-zoom, 3d-text-depth-layers
- registry: grain-overlay, vignette

El reloj que corrió en la esquina durante todo el video se agranda hasta ocupar
el centro y acelera. No es una cifra ni una promesa: es la interfaz del propio
video volviéndose el argumento. Cierra en oscuro con una sola línea en 400 px.

## Frame 7 — Escribinos

- scene: Mosaico con las seis escenas anteriores que se aleja y abre a la placa final
- duration: 8s
- poster: 6.5s
- transition_in: cut
- status: animated
- voiceover: "Si te está pasando, no esperes a estar seguro de que es grave. Escribinos por WhatsApp. La primera orientación es confidencial."
- src: compositions/07-cierre.html
- bloques: 14, 15
- blueprint: logo-assemble-lockup
- rules: spring-pop-entrance, nudge-curve
- registry: transitions-grid, grain-overlay, vignette

El bloque 14 entra palabra por palabra, más lento que todo lo anterior: es la
única vez que el video baja la velocidad a propósito. Después el mosaico con
miniaturas de las seis escenas se aleja y abre a la placa: logo, WhatsApp, San
Nicolás de los Arroyos. CTA único.

El logo está pendiente — mientras no llegue el archivo, la placa usa el wordmark
en Montserrat 900 como provisorio.
