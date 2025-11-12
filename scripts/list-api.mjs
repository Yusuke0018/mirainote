#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "src", "app", "api");
const OUT = path.join(ROOT, "docs", "API_ROUTES.md");

function* walk(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function httpMethodsFrom(content) {
  const m = [];
  for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
    if (content.includes(`export async function ${method}`)) m.push(method);
  }
  return m;
}

function routePathFrom(file) {
  // src/app/api/.../route.ts → /api/...
  const rel = path.relative(API_DIR, path.dirname(file));
  return (
    "/api/" +
    rel
      .split(path.sep)
      .map((s) => s)
      .join("/")
  );
}

function main() {
  if (!fs.existsSync(API_DIR)) {
    console.error("No api dir:", API_DIR);
    process.exit(1);
  }
  const rows = [];
  for (const f of walk(API_DIR)) {
    if (!f.endsWith("route.ts")) continue;
    const content = fs.readFileSync(f, "utf8");
    const methods = httpMethodsFrom(content);
    const p = routePathFrom(f);
    rows.push({
      path: p,
      methods: methods.join(", "),
      file: path.relative(ROOT, f),
    });
  }
  rows.sort((a, b) => a.path.localeCompare(b.path));
  const lines = [];
  lines.push("# API ルート一覧（自動生成）");
  lines.push("");
  lines.push("| Path | Methods | File |");
  lines.push("|---|---|---|");
  for (const r of rows) lines.push(`| ${r.path} | ${r.methods} | ${r.file} |`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n"));
  console.log("Wrote", OUT);
}

main();
