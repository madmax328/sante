#!/usr/bin/env bash
# Prepares an AI-generated (or filmed) exercise video for Sorloo.
#   ./exercise-video.sh <video> <exercise-id> [start-seconds] [duration-seconds] [crop-x] [crop-width]
# Keeps one repetition (start → duration) so it loops cleanly, crops a square
# around the person (crop-x = left edge of the 1080-px square in a 1920×1080
# video, default 420), removes the sound and writes, in public/exercises/:
#   <id>.mp4  (website), <id>.webp (app, animated image), <id>.jpg (still image)
# Then add the id to packages/catalog/src/videos.ts.
set -euo pipefail
src="$1"; id="$2"; start="${3:-0}"; dur="${4:-3}"; x="${5:-420}"; w="${6:-}"
out="$(cd "$(dirname "$0")/.." && pwd)/public/exercises"
mkdir -p "$out"
if [ -n "$w" ]; then
  # Floor exercises are wider than tall: the whole width (crop-width pixels from
  # crop-x) is shown over a blurred copy of the scene, instead of being cut.
  vf="[0:v]split[a][b];[a]crop=$w:ih:$x:0,scale=720:-2[fg];[b]scale=-2:720,crop=720:720,boxblur=24:2,eq=brightness=0.04[bg];[bg][fg]overlay=0:(H-h)/2,fps=30"
else
  vf="crop=min(ih\,iw):min(ih\,iw):min($x\,iw-min(ih\,iw)):0,scale=720:720,fps=30"
fi
ffmpeg -v error -y -ss "$start" -i "$src" -t "$dur" -an -filter_complex "$vf" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart "$out/$id.mp4"
ffmpeg -v error -y -i "$out/$id.mp4" -vf "fps=15,scale=480:480:flags=lanczos" -c:v libwebp_anim -loop 0 -quality 70 -compression_level 6 "$out/$id.webp"
ffmpeg -v error -y -i "$out/$id.mp4" -frames:v 1 -vf "scale=480:480" -q:v 4 "$out/$id.jpg"
ls -la "$out/$id".*
