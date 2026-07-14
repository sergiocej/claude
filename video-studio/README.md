# Estudio de edición de video

Este repo incorpora dos herramientas de código abierto para editar, recortar y animar video con Claude Code:

- **[video-use](https://github.com/browser-use/video-use)** (vendorizado en `tools/video-use/`) — edición conversacional: transcribe, recorta muletillas/silencios, aplica color, quema subtítulos y genera overlays de animación. Registrado como skill de proyecto en `.claude/skills/video-use`.
- **[hyperframes](https://github.com/heygen-com/hyperframes)** — motor de render HTML→video (animaciones con GSAP, Lottie, Three.js, etc.). Se usa vía `npx hyperframes ...` (no vendorizado; se descarga de npm bajo demanda). Sus 20 skills de agente ya están instalados en `.claude/skills/hyperframes*`. video-use lo usa como uno de sus motores de animación.

## Cómo editar un video en esta sesión

1. Soltá los clips originales en `video-studio/footage/` (esta carpeta está en `.gitignore`, no se versiona el video pesado).
2. Iniciá una conversación normal conmigo pidiendo la edición, por ejemplo: *"editá los clips de footage/ en un video de lanzamiento de 30 segundos"*.
3. Los resultados (`preview.mp4`, `final.mp4`, transcripciones, `edl.json`, `project.md`) se generan en `video-studio/footage/edit/` (también gitignoreado).
4. Si querés conservar el resultado final, decímelo explícitamente y lo commiteamos aparte (o te lo envío como archivo).

## Requisitos pendientes

- **API key de ElevenLabs** (necesaria para transcripción en video-use): conseguila gratis en https://elevenlabs.io/app/settings/api-keys y pegala cuando te la pida — se guarda en `tools/video-use/.env` (gitignoreado, nunca se sube).
- ffmpeg, Chrome headless (para hyperframes) y las dependencias Python de video-use se instalan automáticamente al iniciar la sesión vía `.claude/hooks/session-start.sh`.

## Estructura

```
video-studio/
├── footage/          # clips de entrada (gitignored, drop your raw footage here)
│   └── edit/         # salidas generadas (gitignored)
└── tools/
    └── video-use/    # vendorizado desde browser-use/video-use (MIT)
```

## Actualizar las herramientas

- video-use: `cd video-studio/tools/video-use && git remote -v` no aplica (se vendorizó sin historial); para actualizar, volver a clonar la última versión de https://github.com/browser-use/video-use y reemplazar el contenido de esta carpeta.
- hyperframes skills: `npx skills add heygen-com/hyperframes --all --full-depth --yes` (reinstala/actualiza los skills en `agent/skills/`, `.agents/skills/`, `.claude/skills/`).
