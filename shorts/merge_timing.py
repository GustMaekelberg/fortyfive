#!/usr/bin/env python3
"""Schrijf de echte TTS-timings (audio/timing.json) terug in story.json.

Gebruik:  python3 -I merge_timing.py --story story.json --timing audio/timing.json

Per scène worden `start`, `end`, `speech_end` en `words` gezet; `est_seconds`
blijft staan als referentie. De renderer leest alleen start/end/words.
"""
import argparse
import json


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", required=True)
    ap.add_argument("--timing", required=True)
    args = ap.parse_args()

    with open(args.story, encoding="utf-8") as f:
        story = json.load(f)
    with open(args.timing, encoding="utf-8") as f:
        timing = json.load(f)

    by_id = {s["id"]: s for s in timing["scenes"]}
    missing = [s["id"] for s in story["scenes"] if s["id"] not in by_id]
    if missing:
        raise SystemExit(f"timing.json mist scènes: {missing}")

    for scene in story["scenes"]:
        t = by_id[scene["id"]]
        scene["start"] = round(t["start"], 3)
        scene["end"] = round(t["end"], 3)
        scene["speech_end"] = round(t["speech_end"], 3)
        scene["words"] = [{"w": w["w"], "t": round(w["t"], 3)} for w in t["words"]]

    story["duration"] = round(timing["total"], 3)
    with open(args.story, "w", encoding="utf-8") as f:
        json.dump(story, f, ensure_ascii=False, indent=2)
        f.write("\n")

    for s in story["scenes"]:
        print(f"{s['id']:<16} {s['start']:7.2f} – {s['end']:7.2f}  ({s['end'] - s['start']:.2f}s)")
    print(f"totaal {story['duration']:.2f}s")


if __name__ == "__main__":
    main()
