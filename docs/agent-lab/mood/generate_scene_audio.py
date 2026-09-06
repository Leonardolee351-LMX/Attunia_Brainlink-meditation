"""Procedural SOUND THERAPY beds for the six WORK_SCENES.

Not songs. Recipes follow music-prompts.json v3 (consultant rewrite 2026-09-05):
distinct per-scene textures, quieter than guidance, loopable ~96s.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
DUR = 96.0
N = int(SR * DUR)


def time_axis(n: int = N) -> np.ndarray:
    return np.arange(n, dtype=np.float64) / SR


def fade(x: np.ndarray, attack: float = 0.8, release: float = 2.4) -> np.ndarray:
    a = min(int(attack * SR), len(x) // 4)
    r = min(int(release * SR), len(x) // 4)
    env = np.ones(len(x), dtype=np.float64)
    env[:a] *= np.linspace(0, 1, a) ** 1.4
    env[-r:] *= np.linspace(1, 0, r) ** 1.2
    return x * env


def normalize(x: np.ndarray, peak: float = 0.72) -> np.ndarray:
    m = np.max(np.abs(x)) + 1e-12
    return (x / m) * peak


def stereo(left: np.ndarray, right: np.ndarray | None = None, delay_ms: float = 11) -> np.ndarray:
    if right is None:
        d = int(delay_ms * SR / 1000)
        right = np.pad(left, (d, 0))[: len(left)] * 0.97
        left = left * 0.97
    s = np.stack([left, right], axis=1)
    return np.clip(s, -1.0, 1.0)


def butter_sos(kind: str, cutoff, order: int = 3):
    ny = SR * 0.49
    if isinstance(cutoff, (tuple, list)):
        wn = [min(c / ny, 0.99) for c in cutoff]
    else:
        wn = min(cutoff / ny, 0.99)
    return butter(order, wn, btype=kind, output="sos")


def colored_noise(n: int, kind: str, rng: np.random.Generator) -> np.ndarray:
    white = rng.standard_normal(n)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    spec = np.fft.rfft(white)
    f = np.maximum(freqs, 20.0)
    if kind == "pink":
        spec /= np.sqrt(f)
    elif kind == "brown":
        spec /= f
    elif kind == "white":
        pass
    else:
        spec /= f**0.35
    y = np.fft.irfft(spec, n)
    return y / (np.max(np.abs(y)) + 1e-12)


def sine(t: np.ndarray, hz: float, amp: float = 1.0, phase: float = 0.0) -> np.ndarray:
    return amp * np.sin(2 * np.pi * hz * t + phase)


def soft_pad(t: np.ndarray, freqs: list[float], amp: float, vibrato: float = 0.08) -> np.ndarray:
    y = np.zeros_like(t)
    for i, f in enumerate(freqs):
        wobble = 1 + 0.003 * np.sin(2 * np.pi * vibrato * t + i)
        y += sine(t, f * wobble, amp / len(freqs), phase=i * 0.7)
        y += 0.18 * sine(t, f * 2 * wobble, amp / len(freqs))
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t)
    return y * lfo


def pulse_clicks(t: np.ndarray, bpm: float, amp: float, every_beats: float = 1.0) -> np.ndarray:
    y = np.zeros_like(t)
    interval = 60.0 / bpm * every_beats
    width = int(0.012 * SR)
    i = 0.9
    while i < DUR - 0.2:
        idx = int(i * SR)
        env = np.hanning(width * 2)
        burst = env * np.sin(2 * np.pi * 420 * np.arange(len(env)) / SR)
        end = min(idx + len(burst), len(y))
        y[idx:end] += burst[: end - idx] * amp
        i += interval
    return y


def bird_chirps(t: np.ndarray, rng: np.random.Generator, count: int = 14) -> np.ndarray:
    y = np.zeros_like(t)
    for _ in range(count):
        start = rng.uniform(4, DUR - 6)
        dur = rng.uniform(0.12, 0.28)
        n = int(dur * SR)
        tt = np.arange(n) / SR
        f0 = rng.uniform(2800, 4200)
        sweep = f0 + rng.uniform(400, 900) * tt / dur
        env = np.hanning(n)
        chirp = env * np.sin(2 * np.pi * np.cumsum(sweep) / SR) * 0.035
        idx = int(start * SR)
        end = min(idx + n, len(y))
        y[idx:end] += chirp[: end - idx]
    return y


def water_drops(t: np.ndarray, rng: np.random.Generator, times: list[float] | None = None) -> np.ndarray:
    y = np.zeros_like(t)
    if times is None:
        times = []
        t0 = 1.2
        while t0 < DUR - 1:
            times.append(t0)
            t0 += float(rng.uniform(0.55, 1.85))
    for start in times:
        n = int(0.22 * SR)
        tt = np.arange(n) / SR
        f = 920 * np.exp(-tt * 9)
        env = np.exp(-tt * 14)
        drop = env * np.sin(2 * np.pi * np.cumsum(f) / SR)
        noise = rng.standard_normal(n) * env * 0.15
        sos = butter_sos("bandpass", (600, 2400), 2)
        body = sosfilt(sos, drop + noise) * 0.09
        idx = int(start * SR)
        end = min(idx + n, len(y))
        y[idx:end] += body[: end - idx]
    return y


def kalimba(t: np.ndarray, hz: float, at: float, amp: float = 0.12) -> np.ndarray:
    y = np.zeros_like(t)
    idx = int(at * SR)
    n = int(1.8 * SR)
    tt = np.arange(n) / SR
    env = np.exp(-tt * 2.4)
    tone = env * (np.sin(2 * np.pi * hz * tt) + 0.25 * np.sin(2 * np.pi * hz * 2 * tt))
    end = min(idx + n, len(y))
    y[idx:end] += tone[: end - idx] * amp
    return y


def thud(t: np.ndarray, at: float) -> np.ndarray:
    y = np.zeros_like(t)
    idx = int(at * SR)
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    env = np.exp(-tt * 18)
    body = env * np.sin(2 * np.pi * 72 * tt)
    click = env * np.sin(2 * np.pi * 180 * tt) * 0.35
    end = min(idx + n, len(y))
    y[idx:end] += (body + click)[: end - idx] * 0.22
    return y


def iso_gain(t: np.ndarray, start: float, end: float) -> np.ndarray:
    return np.clip(start + (end - start) * (t / DUR), min(start, end), max(start, end))


def mix(*parts: np.ndarray) -> np.ndarray:
    y = np.zeros_like(parts[0])
    for p in parts:
        y = y + p
    return y


def wood_edge_clicks(t: np.ndarray, interval_sec: float, amp: float) -> np.ndarray:
    """Ultra-soft wood micro-touch — suggests an edge, not a metronome."""
    y = np.zeros_like(t)
    width = int(0.018 * SR)
    i = 1.1
    while i < DUR - 0.3:
        idx = int(i * SR)
        env = np.hanning(width * 2)
        tt = np.arange(len(env)) / SR
        burst = env * (np.sin(2 * np.pi * 380 * tt) * 0.55 + np.sin(2 * np.pi * 190 * tt) * 0.35)
        end = min(idx + len(burst), len(y))
        y[idx:end] += burst[: end - idx] * amp
        i += interval_sec
    return y


def scene_clock_in(rng: np.random.Generator) -> np.ndarray:
    t = time_axis()
    hvac = sosfilt(butter_sos("lowpass", 900), colored_noise(N, "pink", rng)) * 0.22
    pad = soft_pad(t, [146.83, 220.00, 293.66], 0.09, 0.05)
    lift = iso_gain(t, 0.78, 1.05)
    # ~4s edge (box-breath side) — softer than old pulse_clicks
    box = wood_edge_clicks(t, 4.0, 0.028)
    birds = bird_chirps(t, rng, 8)
    breath = (0.82 + 0.18 * np.sin(2 * np.pi * (1 / 16) * t))  # gentle 16s swell
    y = mix(hvac, pad * lift * breath, box, birds)
    return stereo(fade(normalize(y, 0.68)))


def scene_post_meet(rng: np.random.Generator) -> np.ndarray:
    t = time_axis()
    tide = sosfilt(butter_sos("lowpass", 280), colored_noise(N, "brown", rng)) * 0.30
    dense = soft_pad(t, [196.0, 246.9, 293.7], 0.11, 0.045)
    sparse = soft_pad(t, [130.8, 196.0], 0.10, 0.035)
    morph = iso_gain(t, 1.0, 0.15)
    # low body hum that thins — no cello solo, no elevator ding
    body = sine(t, 65.4, 0.05) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.035 * t))
    exhale = 0.75 + 0.25 * np.sin(2 * np.pi * (1 / 19) * t + 1.2)  # long-exhale weighted
    cloth = sosfilt(butter_sos("bandpass", (150, 700), 2), colored_noise(N, "pink", rng)) * 0.05
    y = mix(tide * exhale, dense * morph, sparse * (1.2 - morph), body * (1 - 0.5 * morph), cloth)
    return stereo(fade(normalize(y, 0.66), 0.4, 3.8))


def scene_lunch_tide(rng: np.random.Generator) -> np.ndarray:
    t = time_axis()
    surf = sosfilt(butter_sos("lowpass", 220), colored_noise(N, "brown", rng)) * 0.34
    leaves = sosfilt(butter_sos("bandpass", (1800, 5200), 2), colored_noise(N, "pink", rng))
    leaves *= 0.045 * (0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * t))
    drone = sine(t, 73.42, 0.08) + sine(t, 110.0, 0.06)
    # rare sparkles only in second half (caffeine waiting)
    sparkle = np.zeros_like(t)
    for at in (48.0, 58.0, 71.0, 84.0):
        idx = int(at * SR)
        n = int(0.28 * SR)
        tt = np.arange(n) / SR
        sparkle[idx : idx + n] += np.hanning(n) * np.sin(2 * np.pi * 2093 * tt) * 0.02
    tide = 0.88 + 0.12 * np.sin(2 * np.pi * 0.028 * t)
    y = mix(surf * tide, leaves, drone * tide, sparkle)
    return stereo(fade(normalize(y, 0.65), 1.2, 3.2))


def scene_overload(rng: np.random.Generator) -> np.ndarray:
    t = time_axis()
    # crowded mid "tabs" then peel — no piano melody
    tabs = np.zeros_like(t)
    for i, f in enumerate([210, 228, 241, 255, 271, 288, 305]):
        tabs += sine(t, f + rng.uniform(-2.0, 2.0), 0.038, i * 0.9)
    peel = np.clip(1.0 - (t - 6) / 26, 0.06, 1.0)
    hiss = sosfilt(butter_sos("highpass", 900), colored_noise(N, "white", rng)) * 0.07 * peel
    cloth = sosfilt(butter_sos("bandpass", (120, 900), 2), colored_noise(N, "pink", rng))
    cloth *= 0.09 * (1.05 - peel * 0.55)
    # sparse table/wood touches as present-moment lands
    table = wood_edge_clicks(t, 5.5, 0.022) * (1.05 - peel)
    ground = soft_pad(t, [98.0, 146.8, 196.0], 0.09, 0.025) * (1.1 - peel)
    air = sosfilt(butter_sos("lowpass", 400), colored_noise(N, "pink", rng)) * 0.06 * (1 - peel * 0.4)
    y = mix(tabs * peel * 0.75, hiss, cloth, table, ground, air)
    return stereo(fade(normalize(y, 0.64), 0.25, 3.0))


def pleasant_asmr_drop(
    t: np.ndarray,
    rng: np.random.Generator,
    at: float,
    *,
    bright: float = 1.0,
    amp: float = 0.11,
) -> np.ndarray:
    """Light joyful water-drop ASMR — brighter than utility drip, never cartoon splash."""
    y = np.zeros_like(t)
    n = int(0.28 * SR)
    tt = np.arange(n) / SR
    f0 = rng.uniform(1100, 1680) * bright
    f = f0 * np.exp(-tt * 7.5)
    env = np.exp(-tt * 11) * (1 - 0.35 * tt / 0.28)
    tone = env * np.sin(2 * np.pi * np.cumsum(f) / SR)
    sparkle = env * np.sin(2 * np.pi * np.cumsum(f * 1.9) / SR) * 0.22
    grit = rng.standard_normal(n) * env * 0.08
    sos = butter_sos("bandpass", (700, 4200), 2)
    body = sosfilt(sos, tone + sparkle + grit) * amp
    idx = int(at * SR)
    end = min(idx + n, len(y))
    y[idx:end] += body[: end - idx]
    return y


def soft_wood_tap(t: np.ndarray, rng: np.random.Generator, at: float, amp: float = 0.04) -> np.ndarray:
    y = np.zeros_like(t)
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    env = np.exp(-tt * 55)
    click = env * np.sin(2 * np.pi * rng.uniform(480, 720) * tt)
    tick = env * rng.standard_normal(n) * 0.35
    sos = butter_sos("bandpass", (300, 2800), 2)
    body = sosfilt(sos, click + tick) * amp
    idx = int(at * SR)
    end = min(idx + n, len(y))
    y[idx:end] += body[: end - idx]
    return y


def scene_drift_back(rng: np.random.Generator) -> np.ndarray:
    """轻松愉悦 ASMR 音效床：水滴 / 木触 / 薄荷空气 — 不是成曲。"""
    t = time_axis()
    drops = np.zeros_like(t)
    # early: playful irregular gaps
    t0 = 0.9
    while t0 < 44:
        drops += pleasant_asmr_drop(t, rng, t0, bright=rng.uniform(0.92, 1.12), amp=rng.uniform(0.085, 0.12))
        # occasional double-drop for lightness
        if rng.random() < 0.22:
            drops += pleasant_asmr_drop(
                t, rng, t0 + rng.uniform(0.12, 0.28), bright=1.05, amp=0.06
            )
        t0 += float(rng.uniform(0.85, 2.35))
    # later: slightly more regular return (still not a beat)
    t0 = 44.2
    while t0 < DUR - 1.5:
        drops += pleasant_asmr_drop(t, rng, t0, bright=1.0, amp=0.1)
        t0 += float(rng.uniform(0.95, 1.35))

    taps = np.zeros_like(t)
    t0 = 3.2
    while t0 < DUR - 2:
        if rng.random() < 0.55:
            taps += soft_wood_tap(t, rng, t0, amp=rng.uniform(0.028, 0.045))
        t0 += float(rng.uniform(1.6, 3.8))

    mint = soft_pad(t, [329.6, 392.0, 523.3], 0.055, 0.09) * iso_gain(t, 0.5, 0.95)
    # soft surface shimmer (not noise wall)
    surface = sosfilt(butter_sos("bandpass", (900, 3200), 2), colored_noise(N, "pink", rng))
    surface *= 0.022 * (0.45 + 0.55 * np.sin(2 * np.pi * 0.07 * t))
    air = sosfilt(butter_sos("lowpass", 350), colored_noise(N, "pink", rng)) * 0.04
    y = mix(drops, taps, mint, surface, air)
    # wider pleasant stereo: drops slightly L/R wander via delay variance
    left = fade(normalize(y, 0.62), 0.5, 2.8)
    right = fade(normalize(y * 0.98 + np.roll(drops, int(0.014 * SR)) * 0.08, 0.62), 0.5, 2.8)
    return stereo(left, right, delay_ms=14)


def scene_clock_out(rng: np.random.Generator) -> np.ndarray:
    t = time_axis()
    wind = sosfilt(butter_sos("bandpass", (80, 1400), 2), colored_noise(N, "brown", rng)) * 0.14
    lamp = soft_pad(t, [110.0, 164.8, 220.0], 0.13, 0.03)
    drawer = thud(t, 7.6)  # single muted wood close
    # soft harmonic air — not a guitar/piano phrase
    air_glow = soft_pad(t, [164.8, 246.9], 0.05, 0.02) * iso_gain(t, 0.4, 1.0)
    kitchen = sosfilt(butter_sos("bandpass", (200, 1200), 2), colored_noise(N, "pink", rng))
    kitchen *= 0.025 * iso_gain(t, 0.2, 0.7)
    y = mix(wind * iso_gain(t, 0.9, 0.55), lamp * iso_gain(t, 0.8, 1.08), drawer, air_glow, kitchen)
    return stereo(fade(normalize(y, 0.66), 0.6, 4.2))


BUILDERS = {
    "clock-in": scene_clock_in,
    "post-meet": scene_post_meet,
    "lunch-tide": scene_lunch_tide,
    "overload": scene_overload,
    "drift-back": scene_drift_back,
    "clock-out": scene_clock_out,
}


def write_wav(path: Path, stereo_f: np.ndarray) -> None:
    pcm = np.int16(np.clip(stereo_f, -1, 1) * 32767)
    wavfile.write(path, SR, pcm)


def main() -> None:
    import sys

    root = Path(__file__).resolve().parent
    out_dir = root / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    public = root.parents[2] / "public" / "audio" / "scenes"
    public.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    seeds = {
        "clock-in": 8401,
        "post-meet": 6802,
        "lunch-tide": 6203,
        "overload": 7204,
        "drift-back": 7605,
        "clock-out": 5806,
    }
    ids = [tid for tid in BUILDERS if not only or tid in only]
    for tid in ids:
        rng = np.random.default_rng(seeds[tid])
        audio = BUILDERS[tid](rng)
        dest = out_dir / f"{tid}.wav"
        write_wav(dest, audio)
        write_wav(public / f"{tid}.wav", audio)
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
