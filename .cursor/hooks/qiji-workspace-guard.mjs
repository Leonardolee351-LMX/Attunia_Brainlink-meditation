import { resolve } from "node:path";
import { stdin } from "node:process";

const PARENT = resolve("E:/Brainlink Meditation").toLowerCase();
const ALLOWED = [
  resolve("E:/Brainlink Meditation/NeuroFlow-AgentLab").toLowerCase(),
  resolve("E:/Brainlink Meditation/app").toLowerCase(),
];

function readStdin() {
  return new Promise((done) => {
    const chunks = [];
    stdin.on("data", (c) => chunks.push(c));
    stdin.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    stdin.on("error", () => done("{}"));
  });
}

function norm(p) {
  return resolve(String(p)).replace(/[\\/]+$/, "").toLowerCase();
}

function isAllowed(p) {
  const n = norm(p);
  if (n === PARENT) return true;
  return ALLOWED.some((root) => n === root || n.startsWith(root + "\\"));
}

function collect(payload) {
  const out = [];
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(add);
      return;
    }
    if (typeof v === "object") {
      add(v.path);
      add(v.root);
      add(v.cwd);
      return;
    }
    out.push(String(v));
  };
  add(payload.workspace_roots);
  add(payload.workspaceRoots);
  add(payload.workspace_root);
  add(payload.workspaceRoot);
  add(payload.cwd);
  add(payload.project_path);
  add(payload.projectPath);
  add(payload.conversation?.project_path);
  add(payload.conversation?.projectPath);
  return [...new Set(out)];
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  payload = {};
}

const paths = collect(payload);
const known = paths.length > 0;
const authorized = !known ? true : paths.every(isAllowed);

const extra = authorized
  ? "This workspace is authorized for the Qiji OpenAI-next API. Do not send raw EEG or identifiable health data. Do not write the key to git or to Cursor global Models settings."
  : "This workspace is NOT authorized for the Qiji OpenAI-next API key. Use only Cursor subscription models. Do not read, paste, or use that key here.";

process.stdout.write(
  JSON.stringify({ additional_context: extra, permission: "allow" }),
);
