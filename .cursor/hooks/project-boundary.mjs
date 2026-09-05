import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";
import { stdin } from "node:process";

const projectRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));

function readStdin() {
  return new Promise((resolveRead) => {
    const chunks = [];
    stdin.on("data", (c) => chunks.push(c));
    stdin.on("end", () => resolveRead(Buffer.concat(chunks).toString("utf8")));
    stdin.on("error", () => resolveRead("{}"));
  });
}

function insideProject(p) {
  if (!p) return true;
  const abs = resolve(p);
  const root = projectRoot.endsWith(sep) ? projectRoot : projectRoot + sep;
  return (
    abs === projectRoot ||
    abs.toLowerCase().startsWith(root.toLowerCase())
  );
}

function deny(message) {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: message,
      agent_message: message,
    }),
  );
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  allow();
  process.exit(0);
}

const candidates = [
  payload.path,
  payload.target_notebook,
  payload.file_path,
  payload.uri,
  payload.arguments?.path,
  payload.tool_input?.path,
].filter(Boolean);

for (const candidate of candidates) {
  const path = String(candidate).replace(/^file:\/\//, "");
  if (!insideProject(path)) {
    deny(`Blocked: path is outside NeuroFlow-AgentLab (${path}).`);
    process.exit(0);
  }
}

allow();
