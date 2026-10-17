#!/usr/bin/env bash
# Usage: ./encode.sh FRAMES_DIR AUDIO_FILE OUT.mp4   (AUDIO_FILE may be missing/empty -> silent video)
set -euo pipefail
FRAMES="${1:?frames dir}"; AUDIO="${2:-}"; OUT="${3:?out.mp4}"; FPS="${FPS:-30}"
if [[ -n "$AUDIO" && -f "$AUDIO" ]]; then
  ffmpeg -y -hide_banner -loglevel warning -framerate "$FPS" -i "$FRAMES/frame_%05d.png" -i "$AUDIO" \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -shortest -c:a copy "$OUT"
else
  echo "no audio file -> encoding silent video" >&2
  ffmpeg -y -hide_banner -loglevel warning -framerate "$FPS" -i "$FRAMES/frame_%05d.png" \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT"
fi
echo "wrote $OUT"
