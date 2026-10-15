# Lorena Di Rocco y Carla D. Rivet — cómo subirlas

**Yo no puedo publicar en el sitio.** `jurisconsultasok.com.ar` es WordPress con
Elementor y no tengo conector ni credenciales. Esto es todo lo preparado para
que lo subas vos en unos minutos.

## Los cuatro archivos

| Archivo | Tamaño | Dónde va |
|---|---|---|
| `lorena-di-rocco-abogada-equipo.webp` | 440 × 560 | Carrusel de Inicio |
| `carla-rivet-abogada-equipo.webp` | 440 × 560 | Carrusel de Inicio |
| `lorena-equipo-hd.webp` | 700 × 1244 | Página Equipo |
| `carla-equipo-hd.webp` | 700 × 1244 | Página Equipo |

Los nombres siguen la convención que ya usás: el carrusel va
`nombre-apellido-abogada-equipo.webp` y la ficha va `nombre-equipo-hd.webp`.

Las del carrusel están al doble del tamaño que muestra el sitio (220 × 280). Se
ven igual, pero nítidas en pantallas de teléfono. Pesan 24 y 30 KB.

Las de Equipo son 700 × 1244, la misma proporción que Martina y Candela. Ojo:
**Sergio y Mauro tienen otra** (700 × 874 y 700 × 933). Tomé como estándar el de
las dos últimas que subiste.

## Paso 1 — subir al Medios de WordPress

Escritorio → Medios → Añadir nuevo. Subí los cuatro. Al terminar, abrí cada uno
y copiá su **URL del archivo**: la vas a necesitar en el paso 2, y va a ser algo
como `.../wp-content/uploads/2026/10/...`. No la adivines, copiala de ahí.

En el campo **Texto alternativo** de cada imagen, pegá:

- Lorena, las dos: `Lorena Di Rocco, abogada de Juris Consultas`
- Carla, las dos: `Carla D. Rivet, abogada de Juris Consultas`

Eso es lo que lee Google y lo que escucha alguien con lector de pantalla.

## Paso 2 — el carrusel de Inicio

La sección es HTML a medida, no un widget: las tarjetas son
`<a class="jc-eq-card">`. En Elementor, editá Inicio, buscá el widget HTML de esa
sección y **pegá estas dos tarjetas justo después de la de Sergio**, antes de la
de Mauro.

```html
<a href="https://jurisconsultasok.com.ar/equipo/" class="jc-eq-card"><img loading="lazy" decoding="async" width="220" height="280" src="PEGAR_URL_DE_LORENA_440x560" alt="Lorena Di Rocco, abogada de Juris Consultas"><h3>Lorena Di Rocco</h3><p>Abogada</p></a>
<a href="https://jurisconsultasok.com.ar/equipo/" class="jc-eq-card"><img loading="lazy" decoding="async" width="220" height="280" src="PEGAR_URL_DE_CARLA_440x560" alt="Carla D. Rivet, abogada de Juris Consultas"><h3>Carla D. Rivet</h3><p>Abogada</p></a>
```

Reemplazá los dos `PEGAR_URL_...` por las URLs del paso 1. El orden queda:
Sergio → **Lorena** → **Carla** → Mauro → Martina → Candela.

El `href` ya apunta a `/equipo/`, igual que las otras cuatro, así que las dos
nuevas van a ser clicables como el resto sin tocar nada más.

Dejé `<p>Abogada</p>` como provisorio: **decime el cargo real de cada una** y lo
cambio. Sergio dice "Fundador · Abogado", así que ahí va lo que corresponda.

## Paso 3 — la página Equipo

Duplicá el bloque de una de las abogadas que ya están (Martina o Candela, que
tienen la misma proporción), cambiá la imagen por la de 700 × 1244, el nombre y
el texto alternativo. La descripción la completás cuando me pases los CV.

## Tres cosas que tenés que mirar antes de publicar

**La foto de Carla no es del mismo registro que las demás.** Es de una
entrevista: hay un micrófono que le cruza el pecho y mira fuera de cámara. Las
otras cuatro son retratos limpios. Recorté lo más cerrado posible para sacar el
logo del backdrop —que es de otra marca y no conviene mostrarlo en tu sitio—,
pero en la versión del carrusel, que es más ancha, **todavía entra un pedacito
del logo arriba**. A 220 px se ve como una mancha, no se lee. El micrófono no se
puede sacar sin retocar la foto, y retocar la imagen de una persona real no lo
hago por mi cuenta: decime vos si querés que lo intente o si consigue una foto
de estudio como las otras.

**La foto de Lorena entró bien.** El recorte conserva los códigos de Derecho
Penal y la estatua de la Justicia, que es lo que le da el tono.

**El HTML actual tiene `loading="lazy"` repetido dos veces** en cada tarjeta. No
rompe nada, el navegador ignora el duplicado. En las dos nuevas lo puse una sola
vez. Si alguna vez tocás las viejas, aprovechá y sacalo.
