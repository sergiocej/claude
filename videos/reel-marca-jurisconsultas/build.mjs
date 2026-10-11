#!/usr/bin/env node
/**
 * build.mjs — sincronía del reel.
 *
 * Lee la voz, calcula cuándo arranca cada bloque y reescribe los tiempos en
 * index.html y en las siete escenas. Si cambia la voz, se vuelve a correr y
 * todo se re-sincroniza: ninguna escena tiene tiempos absolutos a mano.
 *
 *   node build.mjs                  # usa los WAV por bloque de audio/bloques
 *   node build.mjs --elevenlabs     # usa audio/elevenlabs.json (con timestamps)
 *
 * Las escenas exponen un bloque delimitado por BEATS-INICIO / BEATS-FIN. Este
 * script lo reemplaza entero. No editar ese bloque a mano.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const usarEleven = process.argv.includes("--elevenlabs");

/* ------------------------------------------------------------------ *
 * Dirección: qué bloque va en qué escena, y cuánto aire queda después.
 * Esto es decisión de montaje, no sale de la voz.
 * ------------------------------------------------------------------ */

const ENTRADA = 0.5; // aire antes de la primera palabra
const COLA = 1.8; // la placa final se sostiene

/** silencio después de cada bloque, en segundos */
const SILENCIO = {
  1: 0.3,
  2: 0.55,
  3: 0.5, // "es vergüenza" tiene que aterrizar
  4: 0.75, // el tubo colapsa acá adentro
  5: 0.3,
  6: 0.55,
  7: 0.6, // EL silencio: el único del video, justo antes del giro
  8: 0.5,
  9: 0.32,
  10: 0.32,
  11: 0.5,
  12: 0.3,
  13: 0.6, // el cierre baja la velocidad a propósito
  14: 0.45,
};

const ESCENAS = [
  { id: "s01-hook", host: "escena-1-gancho", archivo: "01-hook.html", bloques: [1, 2], cierre: 0.25 },
  { id: "s02-verguenza", host: "escena-2-verguenza", archivo: "02-verguenza.html", bloques: [3, 4], cierre: 0.62 },
  { id: "s03-prueba", host: "escena-3-prueba", archivo: "03-prueba.html", bloques: [5, 6], cierre: 0.3 },
  { id: "s04-quiebre", host: "escena-4-quiebre", archivo: "04-quiebre.html", bloques: [7, 8], cierre: 0.25 },
  { id: "s05-mitades", host: "escena-5-mitades", archivo: "05-mitades.html", bloques: [9, 10, 11], cierre: 0.25 },
  { id: "s06-tiempo", host: "escena-6-tiempo", archivo: "06-tiempo.html", bloques: [12, 13], cierre: 0.3 },
  { id: "s07-cierre", host: "escena-7-cierre", archivo: "07-cierre.html", bloques: [14, 15], cierre: COLA },
];

/** nombre de sección del HUD y si lleva la etiqueta "datos ilustrativos" */
const SECCION = {
  1: ["gancho", false],
  2: ["gancho", true],
  3: ["la vergüenza", false],
  4: ["la vergüenza", false],
  5: ["la prueba", true],
  6: ["la prueba", true],
  7: ["el quiebre", false],
  8: ["el quiebre", false],
  9: ["las dos mitades", false],
  10: ["las dos mitades", false],
  11: ["las dos mitades", false],
  12: ["el tiempo", false],
  13: ["el tiempo", false],
  14: ["cierre", false],
  15: ["cierre", false],
};

/** tinta del HUD según el fondo que haya en pantalla en ese momento */
const TINTA = {
  clara: { ink: "245, 245, 245", alpha: "0.55", vineta: "rgba(0, 0, 0, 0.52)" },
  oscura: { ink: "17, 17, 17", alpha: "0.72", vineta: "rgba(40, 34, 20, 0.26)" },
  dorada: { ink: "17, 17, 17", alpha: "0.78", vineta: "rgba(60, 40, 0, 0.3)" },
};

const CAMBIOS_HUD = [
  { escena: 1, tinta: "clara" },
  { escena: 3, tinta: "oscura" },
  { escena: 4, tinta: "clara" },
  { escena: 4, bloque: 8, offset: -0.1, tinta: "dorada" }, // el iris ya abrió
  { escena: 6, offset: 1.0, tinta: "clara" }, // el dorado se retiró
  { escena: 7, tinta: "oscura" },
  { escena: 7, bloque: 15, offset: -0.3, tinta: "clara" }, // la placa
];

/* ------------------------------------------------------------------ *
 * 1. De dónde salen los tiempos
 * ------------------------------------------------------------------ */

const guion = JSON.parse(readFileSync(join(RAIZ, "audio/guion.json"), "utf8"));

function duracionWav(ruta) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", ruta,
  ]);
  return parseFloat(String(out).trim());
}

/**
 * Reparte un bloque en palabras. Si hay tiempos reales los usa; si no, los
 * estima por largo de cada palabra. ElevenLabs devuelve tiempos por carácter,
 * así que con --elevenlabs esto es exacto y la estimación no corre.
 */
function partirEnPalabras(texto, inicio, dur, realesOpcional) {
  if (realesOpcional) return realesOpcional;
  const palabras = texto.split(/\s+/).filter(Boolean);
  const pesos = palabras.map((p) => p.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6);
  const total = pesos.reduce((a, b) => a + b, 0);
  let t = inicio;
  return palabras.map((p, i) => {
    const d = (pesos[i] / total) * dur;
    const w = { t: p, inicio: +t.toFixed(3), fin: +(t + d).toFixed(3) };
    t += d;
    return w;
  });
}

let fuente, duraciones, palabrasReales = {};

if (usarEleven) {
  const ruta = join(RAIZ, "audio/elevenlabs.json");
  if (!existsSync(ruta)) {
    console.error("Falta audio/elevenlabs.json (respuesta de text-to-speech/{voice_id}/with-timestamps).");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(ruta, "utf8"));
  // Formato esperado: { bloques: [ { n, duracion, caracteres:[{c,inicio,fin}] } ] }
  fuente = "elevenlabs";
  duraciones = {};
  for (const b of raw.bloques) {
    duraciones[b.n] = b.duracion;
    if (b.caracteres) palabrasReales[b.n] = agruparCaracteres(b.caracteres);
  }
} else {
  fuente = "kokoro-local (descartable)";
  duraciones = {};
  for (const b of guion) {
    const wav = join(RAIZ, `audio/bloques/b${String(b.n).padStart(2, "0")}.wav`);
    duraciones[b.n] = duracionWav(wav);
  }
}

/** agrupa timestamps por carácter de ElevenLabs en palabras */
function agruparCaracteres(chars) {
  const palabras = [];
  let actual = null;
  for (const c of chars) {
    if (/\s/.test(c.c)) {
      if (actual) palabras.push(actual), (actual = null);
      continue;
    }
    if (!actual) actual = { t: "", inicio: c.inicio, fin: c.fin };
    actual.t += c.c;
    actual.fin = c.fin;
  }
  if (actual) palabras.push(actual);
  return palabras;
}

/* ------------------------------------------------------------------ *
 * 2. Línea de tiempo
 * ------------------------------------------------------------------ */

let t = ENTRADA;
const bloques = [];
for (const b of guion) {
  const dur = duraciones[b.n];
  const inicio = t;
  const fin = t + dur;
  bloques.push({
    n: b.n,
    texto: b.texto,
    inicio: +inicio.toFixed(3),
    fin: +fin.toFixed(3),
    duracion: +dur.toFixed(3),
    silencioDespues: SILENCIO[b.n] ?? 0,
    palabras: partirEnPalabras(b.texto, inicio, dur, palabrasReales[b.n]),
  });
  t = fin + (SILENCIO[b.n] ?? 0);
}

const bloquePorN = Object.fromEntries(bloques.map((b) => [b.n, b]));

let cursor = 0;
const escenas = ESCENAS.map((e, i) => {
  const ultimo = bloquePorN[e.bloques[e.bloques.length - 1]];
  const inicio = i === 0 ? 0 : cursor;
  const fin = ultimo.fin + e.cierre;
  cursor = fin;
  return { ...e, inicio: +inicio.toFixed(3), duracion: +(fin - inicio).toFixed(3) };
});

const TOTAL = +cursor.toFixed(3);

/* ------------------------------------------------------------------ *
 * 3. La pista de voz
 * ------------------------------------------------------------------ */

if (!usarEleven) {
  const partes = [];
  const filtros = [];
  let n = 0;
  partes.push("-f", "lavfi", "-t", String(ENTRADA), "-i", "anullsrc=r=24000:cl=mono");
  n += 1;
  for (const b of bloques) {
    partes.push("-i", join(RAIZ, `audio/bloques/b${String(b.n).padStart(2, "0")}.wav`));
    n += 1;
    const s = b.silencioDespues || (b.n === 15 ? COLA : 0);
    if (s > 0) {
      partes.push("-f", "lavfi", "-t", String(s), "-i", "anullsrc=r=24000:cl=mono");
      n += 1;
    }
  }
  for (let i = 0; i < n; i += 1) filtros.push(`[${i}:a]`);
  execFileSync(
    "ffmpeg",
    ["-loglevel", "error", "-y", ...partes,
     "-filter_complex", `${filtros.join("")}concat=n=${n}:v=0:a=1[out]`,
     "-map", "[out]", "-ar", "24000", "-ac", "1",
     join(RAIZ, "audio/voz.wav")],
  );
}

/* ------------------------------------------------------------------ *
 * 4. Escribir la alineación y parchar los archivos
 * ------------------------------------------------------------------ */

writeFileSync(
  join(RAIZ, "audio/alineacion.json"),
  JSON.stringify({ fuente, total: TOTAL, bloques, escenas }, null, 2),
);

function reemplazarBeats(ruta, beatsJs) {
  let s = readFileSync(ruta, "utf8");
  const re = /(\/\* === BEATS-INICIO[\s\S]*?\*\/)[\s\S]*?(\/\* === BEATS-FIN === \*\/)/;
  if (!re.test(s)) throw new Error(`Faltan los marcadores BEATS en ${ruta}`);
  s = s.replace(re, `$1\n${beatsJs}\n          $2`);
  writeFileSync(ruta, s);
}

for (const e of escenas) {
  const locales = e.bloques.map((n) => +(bloquePorN[n].inicio - e.inicio).toFixed(3));
  const fines = e.bloques.map((n) => +(bloquePorN[n].fin - e.inicio).toFixed(3));
  const palabras = e.bloques.map((n) =>
    bloquePorN[n].palabras.map((w) => [+(w.inicio - e.inicio).toFixed(3), +(w.fin - e.inicio).toFixed(3)]),
  );
  const js =
    `          var B = ${JSON.stringify(locales)};\n` +
    `          var BF = ${JSON.stringify(fines)};\n` +
    `          var D = ${e.duracion};\n` +
    `          var W = ${JSON.stringify(palabras)};`;
  reemplazarBeats(join(RAIZ, "compositions", e.archivo), js);
}

/* --- index.html --- */
let idx = readFileSync(join(RAIZ, "index.html"), "utf8");

idx = idx.replace(/(id="root"[\s\S]*?data-duration=")[\d.]+(")/, `$1${TOTAL}$2`);
idx = idx.replace(/(duration: )[\d.]+(,\s*\n\s*ease: "none",\s*\n\s*onUpdate)/, `$1${TOTAL}$2`);
idx = idx.replace(/(xPercent: -6, yPercent: 4, duration: )[\d.]+/, `$1${TOTAL}`);

for (const e of escenas) {
  const re = new RegExp(`(id="${e.host}"[\\s\\S]*?data-start=")[\\d.]+("[\\s\\S]*?data-duration=")[\\d.]+(")`);
  idx = idx.replace(re, `$1${e.inicio}$2${e.duracion}$3`);
}

const filas = bloques
  .map((b) => {
    const [sec, ilus] = SECCION[b.n];
    return `          { t: ${b.inicio}, n: ${b.n}, section: "${sec}", illus: ${ilus} }`;
  })
  .join(",\n");
idx = idx.replace(/( {8}var BLOCKS = \[)[\s\S]*?(\n {8}\];)/, `$1\n${filas},$2`);

const lineasHud = CAMBIOS_HUD.map((c) => {
  const esc = escenas[c.escena - 1];
  const base = c.bloque ? bloquePorN[c.bloque].inicio : esc.inicio;
  const at = +(base + (c.offset ?? 0)).toFixed(3);
  const p = TINTA[c.tinta];
  return (
    `        tl.set("#root", { "--hud-ink": "${p.ink}", "--hud-alpha": "${p.alpha}" }, ${at});\n` +
    `        tl.set("#root", { "--vignette-color": "${p.vineta}" }, ${at});`
  );
}).join("\n");

const relevoReloj =
  `\n\n        /* La escena 6 se queda con el reloj: el de la esquina se apaga.\n` +
  `           Una sub-composición no puede animar elementos de la raíz. */\n` +
  `        tl.set("#hud-clock", { opacity: 0 }, ${escenas[5].inicio});\n` +
  `        tl.set("#hud-clock", { opacity: 1 }, ${+(escenas[6].inicio - 0.1).toFixed(3)});`;

idx = idx.replace(
  /( {8}\/\* === HUD-INICIO[\s\S]*?\*\/)[\s\S]*?( {8}\/\* === HUD-FIN === \*\/)/,
  `$1\n${lineasHud}${relevoReloj}\n$2`,
);

writeFileSync(join(RAIZ, "index.html"), idx);

/* ------------------------------------------------------------------ */

console.log(`fuente de voz : ${fuente}`);
console.log(`voz hablada   : ${bloques.reduce((a, b) => a + b.duracion, 0).toFixed(2)} s`);
console.log(`total del reel: ${TOTAL} s`);
console.log("");
for (const e of escenas) {
  console.log(
    `  ${e.id.padEnd(14)} ${String(e.inicio).padStart(6)} s  +${String(e.duracion).padStart(5)} s   bloques ${e.bloques.join(", ")}`,
  );
}
console.log("\nalineación → audio/alineacion.json");
