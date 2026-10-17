#!/usr/bin/env python3
"""Synthesised cinematic tension bed (numpy only, no samples) driven by scene types.

Usage:
    python3 -I ambience.py --timing audio/timing.json --story story.json --out audio/ambience.wav [--seed 45]

Output: 48 kHz stereo wav, length = timing total + 1.0 s, peak ~ -14 dBFS (voice stays on top).
Deterministic for a given --seed.

Layers (scene `type` is looked up in story.json by scene id):
    always              low drone (55 Hz + 82.5 Hz sines, detuned L/R, slow AM) + brown-noise wind
    highway_jam         2-3 distant car horns (low-passed sawtooth, random pan, reverb)
    leaving_car         horns that thin out and stop one by one
    lanes_movement,
    basement_heater     slow heartbeat (lub-dub every 1.1 s, 50 Hz decaying sine)
    bike_ride,
    farm_roads,
    barn_sunset,
    dog_morning         major-ish pad (110/165/220 Hz + quiet 277 Hz), drone lifted, more wind
    dog_morning         + quiet bird chirps (2-4 kHz sweeps)
    fact_card           whoosh swell + impact (noise burst + 60 Hz thump) at scene start
    end_card (last)     everything decays over the last 1.5 s
Layer on/off per scene is smoothed with 0.4 s crossfades; global fade-in 1 s, fade-out 1.5 s.
Needs: numpy, soundfile (or scipy as a fallback for writing the wav).
"""
import argparse
import json
import sys

import numpy as np

SR = 48000
CR = 500                 # control rate (Hz) for envelopes / masks
XFADE = 0.4              # scene-section crossfade, seconds
TAIL = 1.0               # ambience runs this long past the narration
FADE_IN, FADE_OUT = 1.0, 1.5
END_DECAY = 1.5
PEAK_DBFS = -14.0


# --------------------------------------------------------------------------- dsp helpers
def fft_filter(x, lo=None, hi=None, order=2, sr=SR):
    """Zero-phase Butterworth-shaped band filter (high-pass at `lo`, low-pass at `hi`), numpy FFT."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    H = np.ones_like(f)
    if hi:
        H /= np.sqrt(1.0 + (f / hi) ** (2 * order))
    if lo:
        H *= 1.0 / np.sqrt(1.0 + (lo / np.maximum(f, 1e-9)) ** (2 * order))
    return np.fft.irfft(X * H, n)


def brown_noise(rng, n):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    x = np.fft.irfft(X / np.maximum(f, 20.0), n)
    return x / np.std(x)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def lfo_noise(rng, n, cutoff_hz):
    """Slow random control signal in 0..1 (gusts), built at the control rate."""
    m = int(n / SR * CR) + 2
    x = fft_filter(rng.standard_normal(m), hi=cutoff_hz, sr=CR)
    x = (x - x.min()) / (x.max() - x.min() + 1e-12)
    return np.interp(np.arange(n) / SR, np.arange(m) / CR, x)


def reverb(stereo, rng, rt60=1.2, mix=0.35):
    """Cheap diffuse reverb: convolve with exponentially decaying noise (FFT)."""
    n = int(rt60 * SR)
    tt = np.arange(n) / SR
    env = 10.0 ** (-3.0 * tt / rt60)  # -60 dB at rt60
    out = np.empty_like(stereo)
    L = stereo.shape[1] + n
    for c in range(2):
        ir = rng.standard_normal(n) * env
        ir = fft_filter(ir, hi=3500)
        ir /= np.sqrt(np.sum(ir ** 2))
        wet = np.fft.irfft(np.fft.rfft(stereo[c], L) * np.fft.rfft(ir, L), L)[: stereo.shape[1]]
        out[c] = (1 - mix) * stereo[c] + mix * wet
    return out


def pan(sig, p):
    """Equal-power pan, p in -1..1 -> (2, n)."""
    a = (p + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)])


def add_at(buf, sig, t0):
    """Add (2,k) or (k,) signal into (2,N) buffer starting at t0 seconds (clipped)."""
    i = int(round(t0 * SR))
    k = sig.shape[-1]
    a, b = max(i, 0), min(i + k, buf.shape[1])
    if b > a:
        buf[:, a:b] += sig[..., a - i : b - i] if sig.ndim == 2 else sig[a - i : b - i]


# --------------------------------------------------------------------------- scene masks
class Timeline:
    def __init__(self, scenes, types, total_len):
        self.scenes, self.types, self.T = scenes, types, total_len
        self.tc = np.arange(int(total_len * CR) + 2) / CR  # control-rate time axis
        self.ta = np.arange(int(round(total_len * SR))) / SR

    def mask(self, wanted, attack=None, release=None):
        """0..1 envelope that is 1 inside scenes whose type is in `wanted`; 0.4 s smoothstep crossfades.
        First scene has no fade-in and last scene runs to the end of the file (global fades handle those).
        attack/release (seconds) add one-pole smoothing for slow pads."""
        m = np.zeros_like(self.tc)
        h = XFADE / 2
        for i, sc in enumerate(self.scenes):
            if self.types.get(sc["id"]) not in wanted:
                continue
            s = -1e9 if i == 0 else sc["start"]
            e = 1e9 if i == len(self.scenes) - 1 else sc["end"]
            m += smoothstep((self.tc - (s - h)) / XFADE) * (1.0 - smoothstep((self.tc - (e - h)) / XFADE))
        m = np.clip(m, 0.0, 1.0)
        if attack or release:
            a_k = 1 - np.exp(-1.0 / (CR * attack)) if attack else 1.0
            r_k = 1 - np.exp(-1.0 / (CR * release)) if release else 1.0
            y, prev = np.empty_like(m), 0.0
            for i, v in enumerate(m):
                prev += (a_k if v > prev else r_k) * (v - prev)
                y[i] = prev
            m = y
        return np.interp(self.ta, self.tc, m)

    def scenes_of(self, wanted):
        return [s for s in self.scenes if self.types.get(s["id"]) in wanted]


# --------------------------------------------------------------------------- layers
def layer_drone(tl, rng):
    t = tl.ta
    ph = rng.uniform(0, 2 * np.pi, 8)
    am1 = 1 + 0.30 * np.sin(2 * np.pi * 0.07 * t + ph[0])
    am2 = 1 + 0.35 * np.sin(2 * np.pi * 0.11 * t + ph[1])
    am3 = 1 + 0.25 * np.sin(2 * np.pi * 0.05 * t + ph[2])
    out = np.zeros((2, len(t)))
    # left / right are slightly detuned from each other -> slow beating and width
    for c, (f1, f2) in enumerate([(55.0, 82.5), (55.35, 82.95)]):
        out[c] = (0.50 * am1 * np.sin(2 * np.pi * f1 * t + ph[3 + c])
                  + 0.34 * am2 * np.sin(2 * np.pi * f2 * t + ph[5 + c])
                  + 0.10 * am3 * np.sin(2 * np.pi * 2 * f1 * t + ph[7]))  # soft 2nd harmonic for small speakers
    level = 1.0 + 0.25 * tl.mask({"bike_ride", "farm_roads", "barn_sunset", "dog_morning"}, attack=1.2, release=0.8)
    level += 0.10 * tl.mask({"highway_jam", "lanes_movement", "basement_heater"})
    return out * level


def layer_wind(tl, rng):
    n = len(tl.ta)
    chans = []
    gust = lfo_noise(rng, n, 0.22)
    for _ in range(2):
        b = brown_noise(rng, n)
        low = fft_filter(b, lo=70, hi=320)
        mid = fft_filter(b, lo=200, hi=650, order=3)
        chans.append(low * (1 - gust) + 0.55 * mid * gust)
    w = np.stack(chans)
    w /= np.std(w)
    swell = 0.55 + 0.45 * gust
    gentle = tl.mask({"bike_ride", "farm_roads", "barn_sunset", "dog_morning"}, attack=1.0, release=1.0)
    return w * swell * (0.09 + 0.09 * gentle)


def layer_pad(tl, rng):
    m = tl.mask({"bike_ride", "farm_roads", "barn_sunset", "dog_morning"}, attack=1.4, release=0.7)
    if not m.any():
        return np.zeros((2, len(tl.ta)))
    t = tl.ta
    ph = rng.uniform(0, 2 * np.pi, 8)
    out = np.zeros((2, len(t)))
    for c in range(2):
        d = 0.0 if c == 0 else 0.4           # Hz-ish detune on the right channel
        for k, (f, a) in enumerate([(110.0, 0.16), (165.0, 0.12), (220.0, 0.09), (277.18, 0.03)]):
            slow = 1 + 0.15 * np.sin(2 * np.pi * (0.06 + 0.02 * k) * t + ph[k])
            out[c] += a * slow * np.sin(2 * np.pi * (f + d * f / 110.0) * t + ph[4 + (k % 4)])
    return out * m


def layer_horns(tl, rng):
    """Distant car horns. highway_jam: 2-3 bursts. leaving_car: bursts that thin out and stop."""
    buf = np.zeros((2, len(tl.ta)))
    for sc in tl.scenes_of({"highway_jam", "leaving_car"}):
        typ = tl.types[sc["id"]]
        s, e = sc["start"], sc["end"]
        lo, hi = s + 0.6, e - 0.9
        if hi - lo < 0.6:
            continue
        n_horns = int(rng.integers(2, 4))
        if typ == "leaving_car":
            n_horns = 3
            hi = min(max(lo + 0.3, s + (e - s) * 0.78), e - 0.5)   # last horn well before the scene ends
        # spread times with minimum spacing
        if n_horns > 1:
            base = np.linspace(lo, hi, n_horns)
            jitter = (hi - lo) / n_horns * 0.25
            times = np.sort(base + rng.uniform(-jitter, jitter, n_horns))
            times = np.clip(times, lo, hi)
        else:
            times = np.array([rng.uniform(lo, hi)])
        for k, t0 in enumerate(times):
            if typ == "leaving_car":
                gain = [1.0, 0.5, 0.22][k]                # each one quieter, shorter, darker than the last
                dur = [0.55, 0.40, 0.25][k]
                cutoff = [1300.0, 1000.0, 800.0][k]
            else:
                gain = rng.uniform(0.7, 1.0)
                dur = rng.uniform(0.35, 0.8)
                cutoff = rng.uniform(900, 1500)
            f0 = rng.uniform(380, 480)                    # typical horn pair: root + major third
            sig = np.zeros(int((dur + 0.4) * SR))
            tt = np.arange(len(sig)) / SR
            for f in (f0, f0 * 1.26):
                saw = 2.0 * ((f * tt + rng.random()) % 1.0) - 1.0
                sig += saw
            env = smoothstep(tt / 0.02) * (1 - smoothstep((tt - dur) / 0.12))
            sig = fft_filter(np.concatenate([sig * env, np.zeros(int(0.2 * SR))]), lo=200, hi=cutoff)
            sig = sig[: len(tt)]
            add_at(buf, pan(sig * gain * 0.22, rng.uniform(-0.9, 0.9)), t0)
    return reverb(buf, rng, rt60=1.6, mix=0.45) if buf.any() else buf


def layer_heartbeat(tl, rng):
    buf = np.zeros((2, len(tl.ta)))
    mask = tl.mask({"lanes_movement", "basement_heater"})
    if not mask.any():
        return buf
    sr = SR
    tt = np.arange(int(0.6 * sr)) / sr

    def thump(f_start, f_end, tau, amp):
        f = f_end + (f_start - f_end) * np.exp(-tt / 0.05)          # pitch drops
        phase = 2 * np.pi * np.cumsum(f) / sr
        return amp * np.sin(phase) * smoothstep(tt / 0.006) * np.exp(-tt / tau)

    lub, dub = thump(62, 50, 0.085, 1.0), thump(55, 45, 0.07, 0.65)
    beats = np.zeros(len(tl.ta))
    for sc in tl.scenes_of({"lanes_movement", "basement_heater"}):
        t0 = sc["start"] + 0.3
        while t0 < sc["end"] + 0.5:
            for sig, off in ((lub, 0.0), (dub, 0.24)):
                i = int((t0 + off) * sr)
                j = min(i + len(sig), len(beats))
                if 0 <= i < j:
                    beats[i:j] += sig[: j - i]
            t0 += 1.1
    beats = fft_filter(beats, lo=25, hi=140)
    return np.stack([beats, beats]) * mask * 0.45


def layer_birds(tl, rng):
    buf = np.zeros((2, len(tl.ta)))
    for sc in tl.scenes_of({"dog_morning"}):
        t = sc["start"] + 0.8 + rng.uniform(0, 0.8)
        while t < sc["end"] - 0.6:
            p = rng.uniform(-0.8, 0.8)
            f0 = rng.uniform(2200, 3300)
            direction = rng.choice([-1, 1])
            for _ in range(int(rng.integers(2, 5))):        # a phrase of 2-4 chirps
                d = rng.uniform(0.05, 0.12)
                tt = np.arange(int(d * SR)) / SR
                f = f0 + direction * rng.uniform(300, 900) * (tt / d) ** 0.8
                f = np.clip(f, 2000, 4200)
                chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2
                add_at(buf, pan(chirp * rng.uniform(0.35, 0.6) * 0.07, p), t)
                t += d + rng.uniform(0.07, 0.16)
            t += rng.uniform(1.6, 3.4)
    return reverb(buf, rng, rt60=1.2, mix=0.3) if buf.any() else buf


def layer_fx(tl, rng):
    """fact_card: whoosh swell into an impact at the scene start."""
    buf = np.zeros((2, len(tl.ta)))
    for sc in tl.scenes_of({"fact_card"}):
        t0 = sc["start"]
        # rising whoosh: noise whose band opens up and swells for 0.45 s before the hit
        pre = int(0.45 * SR)
        n = rng.standard_normal(pre + int(0.9 * SR))
        n = fft_filter(n, lo=300, hi=3500)
        tt = np.arange(len(n)) / SR
        swell = np.where(tt < 0.45, smoothstep(tt / 0.45) ** 2, np.exp(-(tt - 0.45) / 0.22)) * 0.20
        add_at(buf, np.stack([n * swell, np.roll(n, 91) * swell]), t0 - 0.45)
        # impact: noise burst with fast decay + 60 Hz thump (pitch drops from 90 Hz)
        k = int(1.4 * SR)
        tk = np.arange(k) / SR
        burst = fft_filter(rng.standard_normal(k), lo=120, hi=2200) * np.exp(-tk / 0.07) * 0.30
        f = 60 + 30 * np.exp(-tk / 0.06)
        thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk / 0.30) * smoothstep(tk / 0.004) * 0.85
        add_at(buf, np.stack([burst + thump, np.roll(burst, 61) + thump]), t0)
    return buf


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--timing", required=True)
    ap.add_argument("--story", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=45)
    args = ap.parse_args()

    timing = json.load(open(args.timing, encoding="utf-8"))
    story = json.load(open(args.story, encoding="utf-8"))
    types = {s["id"]: s.get("type") for s in story.get("scenes", [])}
    scenes = timing["scenes"]
    for s in scenes:
        if s["id"] not in types:
            print(f"warning: scene {s['id']!r} not in story.json; drone + wind only", file=sys.stderr)

    total = float(timing["total"]) + TAIL
    tl = Timeline(scenes, types, total)
    rng = np.random.default_rng(args.seed)
    n = len(tl.ta)

    layers = {
        "drone": layer_drone(tl, rng),
        "wind": layer_wind(tl, rng),
        "pad": layer_pad(tl, rng),
        "horns": layer_horns(tl, rng),
        "heartbeat": layer_heartbeat(tl, rng),
        "birds": layer_birds(tl, rng),
        "fx": layer_fx(tl, rng),
    }
    mix = sum(layers.values())
    mix = np.stack([fft_filter(mix[0], lo=28), fft_filter(mix[1], lo=28)])

    # master envelope: fade-in, fade-out, and an extra decay if the last scene is an end_card
    t = tl.ta
    env = smoothstep(t / FADE_IN)
    env *= 0.5 * (1 + np.cos(np.pi * np.clip((t - (total - FADE_OUT)) / FADE_OUT, 0, 1)))
    if types.get(scenes[-1]["id"]) == "end_card":
        env *= np.exp(-3.5 * np.clip((t - (total - END_DECAY)) / END_DECAY, 0, 1))
    mix *= env

    peak = np.abs(mix).max()
    mix *= 10.0 ** (PEAK_DBFS / 20.0) / peak
    out = np.clip(mix.T, -1, 1).astype(np.float32)

    try:
        import soundfile as sf
        sf.write(args.out, out, SR, subtype="PCM_24")
    except ImportError:
        from scipy.io import wavfile
        wavfile.write(args.out, SR, out)

    rms = 20 * np.log10(np.sqrt(np.mean(out ** 2)))
    print(f"wrote {args.out}: {len(out)/SR:.2f} s, {SR} Hz stereo, peak {PEAK_DBFS:.1f} dBFS, rms {rms:.1f} dBFS")
    for s in scenes:
        a, b = int(s["start"] * SR), min(int(s["end"] * SR), len(out))
        seg = out[a:b]
        print(f"  {s['id']:<18}{str(types.get(s['id'])):<18}{s['start']:7.2f}-{s['end']:6.2f}s  "
              f"rms {20*np.log10(np.sqrt(np.mean(seg**2))+1e-9):6.1f} dBFS  peak {20*np.log10(np.abs(seg).max()+1e-9):6.1f}")


if __name__ == "__main__":
    main()
