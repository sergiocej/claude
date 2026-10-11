# frame.md — verdad de diseño

Este archivo manda sobre cualquier decisión visual. Si algo en una escena lo
contradice, la escena está mal.

## Lienzo

1080 × 1920 (9:16). Destino: feed y reels de Instagram, se mira chico en un
teléfono. Eso fija los tamaños de abajo.

## Paleta

```css
--bg-dark:     #0a0a0a;   /* fondo base */
--bg-dark-2:   #111111;   /* capa de apoyo, paneles */
--bg-light:    #f5f5f5;   /* fondo claro: preguntas y datos */
--accent:      #C9A84C;   /* dorado de marca, golpes de una palabra */
--accent-soft: #e0bc6a;   /* dorado secundario, trazos finos */
--alert:       #8E2A2A;   /* rojo apagado: el problema */
--fg-on-dark:  #f5f5f5;
--fg-on-light: #111111;
```

Regla de fondos: oscuro para el problema y lo técnico, claro para preguntas y
datos, dorado a pantalla completa solo para golpes de una palabra. El problema
usa `--alert`; la solución, `--accent`.

**Contraste.** Sobre dorado el texto va en `--fg-on-light` (8,1:1), nunca
blanco. Sobre `--alert`, texto en `--fg-on-dark` (11,7:1).

## Tipografía

Las dos familias están pre-bundleadas en HyperFrames: renderizan offline, sin
fetch, sin `@font-face` propio.

| Rol | Familia | Pesos que existen |
|---|---|---|
| Títulos | Montserrat | 400 · 700 · **900** |
| Datos, HUD, etiquetas | JetBrains Mono | 400 · 700 |

Montserrat **no tiene 300, 500, 600 ni 800** — pedirlos da un peso sintético.
El contraste de peso es 400 contra 900, nada en el medio.

La tensión del par es deliberada: Montserrat es la voz que habla, JetBrains Mono
es el sistema que registra. Humano contra máquina, que es de lo que trata el
video.

- Títulos: `clamp` entre 150 y 400 px, peso 900, **minúscula**,
  `letter-spacing: -0.03em` sobre oscuro y `-0.04em` sobre claro (el fondo
  oscuro engorda la letra, así que se afloja un punto).
- `line-height: 0.92` en display; sobre oscuro, 0.97.
- Cuerpo: Montserrat 400, mínimo 34 px.
- Datos y HUD: JetBrains Mono 400, mínimo 26 px, mayúscula,
  `letter-spacing: 0.08em`, `font-variant-numeric: tabular-nums`.
- Palabras que se animan por separado se separan con `margin-right`, nunca con
  un espacio: el interletrado negativo se lo come.

## Interfaz de técnico (HUD)

Fija en las cuatro esquinas, siempre en JetBrains Mono, siempre presente:

| Posición | Contenido |
|---|---|
| Arriba izquierda | Nombre de la sección, mayúscula |
| Arriba derecha | `JURIS CONSULTAS · 00:00:00` con el tiempo corriendo |
| Abajo derecha | Contador de bloque, `07 / 15` |
| Abajo izquierda | `datos ilustrativos` solo donde corresponde |

Más marcas de esquina en L, 2 px, 64 px de brazo. El color del HUD cambia según
el fondo: `--fg-on-dark` al 55 % sobre oscuro, `--fg-on-light` al 55 % sobre
claro y sobre dorado.

El reloj corre del tiempo de la línea de tiempo, nunca de `Date.now()`.

## Capa de fondo

Dos decorativos persistentes en todas las escenas, con una sola respiración
compartida:

1. Resplandor radial tintado al acento, opacidad máxima 0,18, escala que respira
   lento.
2. Palabra fantasma gigante al 4 % de opacidad, deriva muy lenta.

Más, sobre todo:

3. `grain-overlay` — grano suave, en toda la pieza.
4. `vignette` — viñeta, en toda la pieza.

## Movimiento

- Entradas de 0,3 a 0,6 s, eases variados, transformaciones combinadas.
- Las letras entran una por una con desenfoque, en sincronía con la voz.
- Nada de cortes secos entre escenas: cada una se transforma en la siguiente.
- Staggers de grupo tope 0,5 s en total, para que una llegada se lea como un
  solo golpe.
- Sin `transition` de CSS en nada animado.
- Todo determinista: ni `Math.random()`, ni `Date.now()`, ni red en el render.
  Las partículas usan posiciones derivadas del índice.

## Lo que no se hace

- Degradado sobre texto (`background-clip: text`).
- Rayas de acento en el borde izquierdo de las tarjetas.
- Cian sobre oscuro, violeta a azul, neón.
- `#000` ni `#fff` puros.
- Grillas de tarjetas idénticas.
- Todo centrado con el mismo peso: el ojo tiene que ir a algún lado.
