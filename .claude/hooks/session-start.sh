#!/bin/bash
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

FAILED=0

# ffmpeg is required by both hyperframes and video-use for rendering/encoding.
if ! command -v ffmpeg >/dev/null 2>&1; then
  if ! apt-get install -y --fix-missing ffmpeg >/tmp/ffmpeg-install.log 2>&1; then
    echo "ffmpeg install failed, see log:"
    cat /tmp/ffmpeg-install.log
    FAILED=1
  fi
fi

# hyperframes' onnxruntime-node dependency tries to download optional CUDA
# binaries on postinstall; that download reliably ECONNRESETs in this
# sandboxed network, so skip it whenever `npx hyperframes ...` runs.
echo 'export ONNXRUNTIME_NODE_INSTALL=skip' >> "$CLAUDE_ENV_FILE"

# Sync video-use's Python dependencies if the vendored copy is present.
VIDEO_USE_DIR="$CLAUDE_PROJECT_DIR/video-studio/tools/video-use"
if [ -d "$VIDEO_USE_DIR" ]; then
  if ! (cd "$VIDEO_USE_DIR" && uv sync >/tmp/video-use-uv-sync.log 2>&1); then
    echo "video-use uv sync failed, see log:"
    cat /tmp/video-use-uv-sync.log
    FAILED=1
  fi
fi

exit "$FAILED"
