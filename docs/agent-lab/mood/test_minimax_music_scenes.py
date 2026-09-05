"""Offline MiniMax instrumental generation smoke test for 6 work scenes.

Reads apiKey from config/llm-apis.local.md (gitignore). Does not print the key.
Writes under docs/agent-lab/mood/audio/minimax/ — not for consult runtime.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCAL = ROOT / "config" / "llm-apis.local.md"
OUT = Path(__file__).resolve().parent / "audio" / "minimax"
HOST = "https://api.minimaxi.com"

# Musical beds (composition), not procedural noise beds.
TRACKS = [
    {
        "id": "clock-in",
        "prompt": (
            "Instrumental meditation training bed for morning focus warm-up at a desk. "
            "Soft warm ambient with gentle Rhodes chords and slow pad harmony in D major, "
            "quiet pink-noise air underneath, distant soft birds as color only. "
            "Kindly awake, unhurried, no drums, no vocals, no lyrics, no EDM, no lo-fi beat loop, "
            "no alarm. About 3 to 5 minutes, loop-friendly soft ending."
        ),
    },
    {
        "id": "post-meet",
        "prompt": (
            "Instrumental cool-down after a meeting. Soft ambient with sparse piano notes "
            "and low warm pad, ISO-style: start slightly denser midrange then gradually empty. "
            "Sage-green calm air, long exhale feeling. No vocals, no drums, no notifications, "
            "no suspense strings, no cello solo heroics. 3 to 5 minutes instrumental only."
        ),
    },
    {
        "id": "lunch-tide",
        "prompt": (
            "Instrumental midday restore bed. Warm sand-colored ambient, soft brown-noise tide, "
            "held low fifth drone, far leaves texture, tiny high sparkles later. Horizontal rest "
            "without lullaby choir. No vocals, no jazz cafe piano, no rainstorm. 3 to 5 minutes."
        ),
    },
    {
        "id": "overload",
        "prompt": (
            "Instrumental grounding bed for cognitive overload. Brief slightly crowded mid tones "
            "that peel into sparse ambient: soft fabric-like pads, open fifths, safe luminous room. "
            "Positive soft landing, never horror drone or alarms. No vocals, no drums. 3 to 5 minutes."
        ),
    },
    {
        "id": "drift-back",
        "prompt": (
            "Instrumental return-from-daydream bed. Mint water ambient, sparse pentatonic droplets "
            "and soft kalimba-like plucks that slowly become a gentle repeating figure. Kind, playful, "
            "no scolding minor piano, no trap hats, no vocals, no pop chorus. 3 to 5 minutes."
        ),
    },
    {
        "id": "clock-out",
        "prompt": (
            "Instrumental clock-out ritual bed. Evening indoor warmth against dark window: soft analog "
            "pad, muted guitar harmonics, one distant low wood thud early then warmer harmony. "
            "Psychological detachment, not sad ballad, not sleep rain loop, no vocals, no drums. "
            "3 to 5 minutes."
        ),
    },
]


def read_minimax_key() -> str:
    text = LOCAL.read_text(encoding="utf-8")
    # Prefer ## minimax block
    m = re.search(
        r"##\s*minimax\s*\n(?:.*\n)*?apiKey:\s*(\S+)",
        text,
        flags=re.IGNORECASE,
    )
    if not m:
        raise SystemExit(f"No minimax apiKey in {LOCAL}")
    key = m.group(1).strip()
    if not key or key in ("", "YOUR_KEY"):
        raise SystemExit("minimax apiKey empty")
    return key


def call_music(api_key: str, model: str, prompt: str) -> dict:
    body = {
        "model": model,
        "prompt": prompt,
        "is_instrumental": True,
        "output_format": "hex",
        "audio_setting": {
            "sample_rate": 44100,
            "bitrate": 256000,
            "format": "mp3",
        },
    }
    req = urllib.request.Request(
        f"{HOST}/v1/music_generation",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=360) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"base_resp": {"status_code": e.code, "status_msg": raw[:500]}}


def main() -> int:
    only = sys.argv[1:]  # optional scene ids
    tracks = [t for t in TRACKS if not only or t["id"] in only]
    api_key = read_minimax_key()
    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "REPORT.json"
    report: list[dict] = []

    # Try paid first, then free tiers if blocked.
    models = ["music-3.0", "music-2.6", "music-3.0-free", "music-2.6-free"]

    for track in tracks:
        print(f"=== {track['id']} ===", flush=True)
        entry: dict = {"id": track["id"], "ok": False, "attempts": []}
        for model in models:
            print(f"  try {model} ...", flush=True)
            t0 = time.time()
            payload = call_music(api_key, model, track["prompt"])
            elapsed = round(time.time() - t0, 1)
            base = payload.get("base_resp") or {}
            code = base.get("status_code")
            msg = base.get("status_msg")
            attempt = {"model": model, "elapsed_s": elapsed, "status_code": code, "status_msg": msg}
            audio_hex = ((payload.get("data") or {}).get("audio")) or ""
            extra = payload.get("extra_info") or {}
            if code == 0 and audio_hex:
                out = OUT / f"{track['id']}.mp3"
                out.write_bytes(bytes.fromhex(audio_hex))
                attempt["file"] = str(out)
                attempt["music_duration_ms"] = extra.get("music_duration")
                attempt["bytes"] = out.stat().st_size
                entry["ok"] = True
                entry["chosen_model"] = model
                entry["file"] = str(out)
                entry["music_duration_ms"] = extra.get("music_duration")
                entry["attempts"].append(attempt)
                print(
                    f"  OK {model} {out.name} duration_ms={extra.get('music_duration')} "
                    f"bytes={attempt['bytes']} ({elapsed}s)",
                    flush=True,
                )
                break
            entry["attempts"].append(attempt)
            print(f"  FAIL {model} code={code} msg={msg} ({elapsed}s)", flush=True)
            # Auth / new-user closed: no point retrying other paid models with same key semantics
            if code in (1004, 2049, 2013) or (isinstance(msg, str) and "410" in msg):
                continue
        report.append(entry)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    ok_n = sum(1 for r in report if r["ok"])
    print(f"DONE {ok_n}/{len(report)} → {OUT}", flush=True)
    return 0 if ok_n == len(report) else 2


if __name__ == "__main__":
    raise SystemExit(main())
