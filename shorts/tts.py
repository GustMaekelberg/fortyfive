#!/usr/bin/env python3
"""Offline narration pipeline: story.json -> per-scene wavs + narration.wav + timing.json.

Usage (run in isolated mode so nothing in the cwd can shadow imports):

    python3 -I tts.py --story story.json --out audio/ [--sid 16] [--speed 0.97]

Engine: sherpa-onnx + Kokoro v1.0 multi-lang (82M params, runs on CPU, ~0.5x real time).

MODEL LOCATION
    MODEL_DIR below must point at the extracted `kokoro-multi-lang-v1_0` folder
    (contains model.onnx, voices.bin, tokens.txt, lexicon-us-en.txt, espeak-ng-data/).
    To (re)create it:
        mkdir -p <dir> && curl -L -o k.tar.bz2 \
          https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2
        tar -xjf k.tar.bz2 -C <dir>
    Override without editing the file:  KOKORO_MODEL_DIR=/path/to/kokoro-multi-lang-v1_0
    Python deps:  pip3 install sherpa-onnx soundfile numpy

Kokoro speaker ids (sid) of interest, English male:
    16 am_michael (default), 26 bm_george, 14 am_fenrir, 17 am_onyx (deepest, lower quality),
    27 bm_lewis, 11 am_adam, 24 bm_daniel, 25 bm_fable, 15 am_liam, 12 am_echo, 13 am_eric.

Output (all mono, sample rate = model rate, 24000 Hz for Kokoro):
    <out>/<scene id>.wav   trimmed + padded clip, exactly the slice of narration.wav
    <out>/narration.wav    all clips concatenated, peak normalised to -3 dBFS
    <out>/timing.json      {"sample_rate", "total", "scenes":[{"id","start","end","speech_end","words":[{"w","t"}]}]}
All times are absolute seconds on the narration.wav timeline.
"""
import argparse
import json
import os
import re
import sys
import time

import numpy as np
import soundfile as sf

# --------------------------------------------------------------------------- config
MODEL_DIR = os.environ.get(
    "KOKORO_MODEL_DIR",
    "/tmp/claude-0/-home-user-fortyfive/6d5226d3-2e56-52d2-afbb-5d90b31b8433/scratchpad/tts/model/kokoro-multi-lang-v1_0",
)
DEFAULT_SID = 16          # am_michael
DEFAULT_SPEED = 0.97      # slightly slower than 1.0 for a calm documentary pace
SILENCE_FLOOR_DB = -45.0  # trim leading/trailing samples quieter than this
EDGE_FADE_S = 0.005       # tiny fade at the trimmed edges to avoid clicks
PAD_S = 0.35              # silence appended after each scene
TITLE_PAD_S = 0.9         # silence appended after the title scene
LAST_PAD_S = 0.0          # silence appended after the last scene
PEAK_DBFS = -3.0          # narration peak after normalisation
# Extra "characters worth of time" credited to a word that ends in punctuation, because
# TTS pauses there. Pure proportional-by-characters is what you get with {} (empty dict).
PAUSE_WEIGHT = {",": 2.0, ";": 2.0, ":": 2.0, "—": 2.0, ".": 4.0, "!": 4.0, "?": 4.0, "…": 4.0}


# --------------------------------------------------------------------------- helpers
def load_tts(num_threads=4):
    import sherpa_onnx as so

    m = MODEL_DIR
    for f in ("model.onnx", "voices.bin", "tokens.txt", "lexicon-us-en.txt", "espeak-ng-data"):
        if not os.path.exists(os.path.join(m, f)):
            sys.exit(f"error: {f} not found in MODEL_DIR={m}\n(see the MODEL LOCATION note at the top of tts.py)")
    kokoro = so.OfflineTtsKokoroModelConfig(
        model=f"{m}/model.onnx",
        voices=f"{m}/voices.bin",
        tokens=f"{m}/tokens.txt",
        data_dir=f"{m}/espeak-ng-data",
        # sherpa-onnx >= 1.12.15 ignores dict_dir for this model, so it is not passed.
        lexicon=f"{m}/lexicon-us-en.txt,{m}/lexicon-zh.txt",
        lang="en-us",
    )
    cfg = so.OfflineTtsConfig(
        model=so.OfflineTtsModelConfig(kokoro=kokoro, num_threads=num_threads, provider="cpu"),
        max_num_sentences=1,
    )
    if not cfg.validate():
        sys.exit("error: sherpa-onnx rejected the TTS config (see messages above)")
    return so.OfflineTts(cfg)


def clean_text(s):
    """Light normalisation so the phonemiser never sees exotic punctuation."""
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "—").replace("...", "…")
    return re.sub(r"\s+", " ", s).strip()


def trim_silence(x, sr, floor_db=SILENCE_FLOOR_DB):
    """Cut leading/trailing samples whose |amplitude| is below floor_db (dBFS)."""
    thr = 10.0 ** (floor_db / 20.0)
    idx = np.flatnonzero(np.abs(x) > thr)
    if idx.size == 0:
        return x[:0]
    y = x[idx[0] : idx[-1] + 1].copy()
    n = min(int(EDGE_FADE_S * sr), len(y) // 2)
    if n > 1:
        ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
        y[:n] *= ramp
        y[-n:] *= ramp[::-1]
    return y


def split_words(text):
    """Whitespace tokens; punctuation-only tokens (e.g. a spaced em dash) join the previous word."""
    words = []
    for tok in text.split():
        if not re.search(r"\w", tok) and words:
            words[-1] += " " + tok
        else:
            words.append(tok)
    return words


def estimate_word_times(text, t0, t1):
    """Spread word start times over [t0, t1] proportionally to character count (+ pause weight)."""
    words = split_words(text)
    if not words:
        return []
    w = []
    for tok in words:
        extra = PAUSE_WEIGHT.get(tok[-1], 0.0) if tok else 0.0
        w.append((len(tok), extra))
    total = sum(a + b for a, b in w)
    out, acc = [], 0.0
    for tok, (n, extra) in zip(words, w):
        out.append({"w": tok, "t": round(t0 + (t1 - t0) * acc / total, 3)})
        acc += n + extra
    return out


def is_title(scene):
    return scene.get("id") == "title" or scene.get("type") == "title"


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--story", required=True, help="story JSON with scenes[].id / narration")
    ap.add_argument("--out", required=True, help="output directory (created)")
    ap.add_argument("--sid", type=int, default=DEFAULT_SID, help="Kokoro speaker id (default %(default)s = am_michael)")
    ap.add_argument("--speed", type=float, default=DEFAULT_SPEED, help="speaking speed, <1 is slower (default %(default)s)")
    ap.add_argument("--pad", type=float, default=PAD_S, help="seconds of silence after each scene")
    ap.add_argument("--title-pad", type=float, default=TITLE_PAD_S, help="seconds of silence after the title scene")
    args = ap.parse_args()

    with open(args.story, encoding="utf-8") as f:
        scenes = json.load(f).get("scenes", [])
    if not scenes:
        sys.exit("error: story has no scenes")
    for s in scenes:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", str(s.get("id", ""))):
            sys.exit(f"error: scene id {s.get('id')!r} must match [A-Za-z0-9_.-]+ (it becomes a filename)")
    os.makedirs(args.out, exist_ok=True)

    tts = load_tts()
    sr = tts.sample_rate
    t_start = time.time()

    clips, meta = [], []
    for i, sc in enumerate(scenes):
        text = clean_text(sc.get("narration", ""))
        if text:
            audio = tts.generate(text, sid=args.sid, speed=args.speed)
            raw = np.asarray(audio.samples, dtype=np.float32)
            if audio.sample_rate != sr:
                sys.exit("error: sample rate changed between calls")
            speech = trim_silence(raw, sr)
        else:
            print(f"warning: scene {sc['id']!r} has no narration", file=sys.stderr)
            raw, speech = np.zeros(0, np.float32), np.zeros(0, np.float32)
        last = i == len(scenes) - 1
        pad_s = LAST_PAD_S if last else (args.title_pad if is_title(sc) else args.pad)
        pad = np.zeros(int(round(pad_s * sr)), np.float32)
        clips.append(np.concatenate([speech, pad]))
        meta.append({"id": sc["id"], "text": text, "raw": len(raw), "speech": len(speech), "pad": len(pad)})

    # one global gain (keeps relative scene levels) so the loudest peak lands on PEAK_DBFS
    full = np.concatenate(clips)
    peak = float(np.abs(full).max()) if full.size else 0.0
    gain = (10.0 ** (PEAK_DBFS / 20.0) / peak) if peak > 0 else 1.0

    timing_scenes, pos = [], 0
    for clip, m in zip(clips, meta):
        clip *= gain
        start = pos / sr
        speech_end = (pos + m["speech"]) / sr
        end = (pos + len(clip)) / sr
        timing_scenes.append({
            "id": m["id"],
            "start": round(start, 3),
            "end": round(end, 3),
            "speech_end": round(speech_end, 3),
            "words": estimate_word_times(m["text"], start, speech_end),
        })
        sf.write(os.path.join(args.out, f"{m['id']}.wav"), clip, sr, subtype="PCM_16")
        pos += len(clip)

    narration = np.concatenate(clips)
    sf.write(os.path.join(args.out, "narration.wav"), narration, sr, subtype="PCM_16")
    timing = {"sample_rate": sr, "total": round(len(narration) / sr, 3), "scenes": timing_scenes}
    txt = json.dumps(timing, indent=2, ensure_ascii=False)
    txt = re.sub(r'\{\s+("w": .*?),\s+("t": [-\d.]+)\s+\}', r"{\1, \2}", txt)  # one word per line
    with open(os.path.join(args.out, "timing.json"), "w", encoding="utf-8") as f:
        f.write(txt + "\n")

    # ---- summary
    print(f"\nmodel kokoro-multi-lang-v1_0  sid={args.sid}  speed={args.speed}  sample_rate={sr} Hz  "
          f"gain={20*np.log10(gain):+.1f} dB  ({time.time()-t_start:.1f}s wall)")
    print(f"{'scene':<16}{'raw s':>7}{'speech s':>10}{'pad s':>7}{'clip s':>8}{'start':>8}{'end':>8}{'words':>7}")
    for m, ts in zip(meta, timing_scenes):
        print(f"{m['id']:<16}{m['raw']/sr:7.2f}{m['speech']/sr:10.2f}{m['pad']/sr:7.2f}"
              f"{ts['end']-ts['start']:8.2f}{ts['start']:8.2f}{ts['end']:8.2f}{len(ts['words']):7d}")
    print(f"{'TOTAL':<16}{'':>7}{'':>10}{'':>7}{timing['total']:8.2f}")


if __name__ == "__main__":
    main()
