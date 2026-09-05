#!/usr/bin/env node
/**
 * Snapshot the repo when VERSION is a multiple of 3.
 * Usage: node scripts/agent-backup.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const versionPath = join(root, "docs", "agent-lab", "VERSION.json");
const backupsDir = join(root, "backups");
const manifestPath = join(backupsDir, "MANIFEST.md");

if (!existsSync(versionPath)) {
  console.error("Missing docs/agent-lab/VERSION.json");
  process.exit(1);
}

const meta = JSON.parse(readFileSync(versionPath, "utf8"));
const version = Number(meta.version);
if (!Number.isInteger(version) || version <= 0) {
  console.error(`Refusing to backup version ${meta.version}. Bump VERSION.json first.`);
  process.exit(1);
}
if (version % 3 !== 0) {
  console.error(`Version ${version} is not a multiple of 3. No backup taken.`);
  process.exit(1);
}

mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const zipName = `v${version}-${stamp}.zip`;
const zipPath = join(backupsDir, zipName);

const exclude = [
  "node_modules",
  ".git",
  "backups",
  "dist",
  "coverage",
  ".env",
];

try {
  execFileSync(
    "tar",
    ["-a", "-c", "-f", zipPath, ...exclude.flatMap((e) => ["--exclude", e]), "."],
    { cwd: root, stdio: "inherit" },
  );
} catch {
  console.error("tar archive failed. On Windows 10+ tar.exe should exist.");
  process.exit(1);
}

meta.last_backup_at_version = version;
writeFileSync(versionPath, `${JSON.stringify(meta, null, 2)}\n`);

const day = new Date().toISOString().slice(0, 10);
const header = `# Backup manifest

Created when \`version\` hits 3, 6, 9, … via \`node scripts/agent-backup.mjs\`.

| Version | File | Created |
|---------|------|---------|
`;
let manifest = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : header;
manifest = manifest.replace(/\| — \| \(none yet.*\|\n/, "");
if (!manifest.includes(`| ${version} | ${zipName} |`)) {
  if (!manifest.includes("| Version | File | Created |")) {
    manifest = header + manifest;
  }
  writeFileSync(manifestPath, `${manifest.trimEnd()}\n| ${version} | ${zipName} | ${day} |\n`);
}

console.log(`Backup written: backups/${zipName}`);
