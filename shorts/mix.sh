#!/usr/bin/env bash
# Mix narration + ambience bed into one AAC file.
#
#   ./mix.sh audio/narration.wav audio/ambience.wav audio/mix.m4a
#
# Voice  : resample to 48 kHz stereo, highpass 80 Hz, light compression (3:1 above -20 dB)
# Bed    : 48 kHz stereo at 0.5 gain (env AMB_GAIN overrides; bed measures ~12 LU below the voice)
# Mix    : amix normalize=0 (no automatic 1/N scaling), length = longest input
# Master : loudnorm to -16 LUFS integrated / -1.5 dBTP (two-pass, linear when possible), AAC 192k
#
# Output length = ambience length (= narration total + 1.0 s tail from ambience.py).
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 narration.wav ambience.wav out.m4a" >&2
  exit 2
fi
NARR=$1; AMB=$2; OUT=$3
for f in "$NARR" "$AMB"; do [ -f "$f" ] || { echo "missing input: $f" >&2; exit 1; }; done
mkdir -p "$(dirname "$OUT")"

I=-16; TP=-1.5; LRA=11
AMB_GAIN=${AMB_GAIN:-0.5}   # override e.g. AMB_GAIN=0.35 ./mix.sh ... for a quieter bed

# Mono narration must be duplicated to both channels. A plain aformat=stereo would
# down-mix with -3 dB per side, so use pan for mono and aformat for anything else.
CH=$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 "$NARR")
if [ "$CH" = "1" ]; then
  VOICE_FMT="pan=stereo|c0=c0|c1=c0"
else
  VOICE_FMT="aformat=channel_layouts=stereo"
fi

PRE="[0:a]aresample=48000,${VOICE_FMT},highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=15:release=200:makeup=2[v];\
[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${AMB_GAIN}[a];\
[v][a]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0[m]"

# ---- pass 1: measure
MEAS=$(ffmpeg -hide_banner -nostats -i "$NARR" -i "$AMB" \
  -filter_complex "${PRE};[m]loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json[o]" \
  -map "[o]" -f null - 2>&1 || true)
get() { printf '%s\n' "$MEAS" | sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" | tail -1; }
MI=$(get input_i); MTP=$(get input_tp); MLRA=$(get input_lra); MTH=$(get input_thresh); MOFF=$(get target_offset)

if [ -n "$MI" ] && [ -n "$MTP" ] && [ -n "$MLRA" ] && [ -n "$MTH" ] && [ -n "$MOFF" ]; then
  LN="loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${MI}:measured_TP=${MTP}:measured_LRA=${MLRA}:measured_thresh=${MTH}:offset=${MOFF}:linear=true"
  echo "pass 1: input ${MI} LUFS, TP ${MTP} dB, LRA ${MLRA} -> pass 2 linear" >&2
else
  LN="loudnorm=I=${I}:TP=${TP}:LRA=${LRA}"
  echo "warning: could not parse loudnorm measurement; using single-pass loudnorm" >&2
fi

# ---- pass 2: render (loudnorm runs internally at 192 kHz, so resample back to 48 kHz)
ffmpeg -y -hide_banner -loglevel error -i "$NARR" -i "$AMB" \
  -filter_complex "${PRE};[m]${LN},aresample=48000[o]" \
  -map "[o]" -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$OUT"

echo "wrote $OUT" >&2
