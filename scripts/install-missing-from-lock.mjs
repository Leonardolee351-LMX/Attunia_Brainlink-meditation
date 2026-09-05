/**
 * 从 package-lock.json 把缺失的 node_modules 包补齐。
 * 用于 npm 10 在本机报 "Exit handler never called" 时的兜底。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nf-lock-"));

const missing = [];
for (const [key, meta] of Object.entries(lock.packages)) {
  if (!key.startsWith("node_modules/") || !meta.resolved) continue;
  if (!fs.existsSync(path.join(root, key, "package.json"))) {
    missing.push({ key, resolved: meta.resolved });
  }
}

console.log(`missing ${missing.length}`);
let ok = 0;
let fail = 0;
for (const { key, resolved } of missing) {
  const url = String(resolved).replace("https://npm.mirrors.msh.team/", "https://registry.npmjs.org/");
  const stamp = key.replaceAll("/", "__");
  const tgz = path.join(tmp, `${stamp}.tgz`);
  const extract = path.join(tmp, stamp);
  try {
    execFileSync("curl.exe", ["-fsSL", "--retry", "2", "-o", tgz, url], { stdio: "ignore" });
    fs.mkdirSync(extract, { recursive: true });
    execFileSync("tar", ["-xzf", tgz, "-C", extract]);
    const dest = path.join(root, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(extract, "package"), dest, { recursive: true });
    ok++;
    if (ok % 20 === 0) console.log(`ok ${ok}/${missing.length}`);
  } catch (e) {
    fail++;
    console.warn("FAIL", key, e instanceof Error ? e.message : e);
  }
}
console.log(`done ok=${ok} fail=${fail}`);
if (fail) process.exit(1);
