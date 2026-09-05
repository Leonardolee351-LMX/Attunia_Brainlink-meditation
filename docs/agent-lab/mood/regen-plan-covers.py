import json, shutil, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve()
while not (root / "package.json").exists():
    root = root.parent
    if root == root.parent:
        raise SystemExit("repo root not found")
data = json.loads((root / "docs/agent-lab/mood/prompts.json").read_text(encoding="utf-8"))
out_docs = root / "docs/agent-lab/mood/generated"
out_pub = root / "public/plans"
out_docs.mkdir(parents=True, exist_ok=True)
out_pub.mkdir(parents=True, exist_ok=True)
mmx = r"C:\Users\Administrator\AppData\Roaming\npm\mmx.cmd"
lock = data["system"]
for t in data["shots"]:
    dest = out_docs / f"{t['id']}.jpg"
    prompt = f"{lock} {t['prompt']}"
    print("===", t["id"], flush=True)
    r = subprocess.run(
        [
            mmx, "image", "generate",
            "--prompt", prompt,
            "--aspect-ratio", "3:4",
            "--seed", str(t["seed"]),
            "--out", str(dest),
            "--quiet", "--non-interactive", "--output", "json",
        ],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    print((r.stdout or "")[-400:], flush=True)
    if r.returncode != 0:
        print("FAIL", (r.stderr or "")[-1200:], flush=True)
        sys.exit(r.returncode)
    shutil.copy2(dest, out_pub / f"{t['id']}.jpg")
print("ALL_OK")
