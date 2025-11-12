#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "STRUCTURE.md");
const IGNORE = new Set(["node_modules", ".next", ".git", ".vscode"]);

function walk(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    const rel = path.relative(ROOT, p);
    files.push({ rel, isDir: e.isDirectory() });
    if (e.isDirectory()) files.push(...walk(p, prefix + "  "));
  }
  return files;
}

function main() {
  const list = walk(ROOT);
  const lines = [];
  lines.push("# プロジェクト構造（自動生成）");
  lines.push("");
  lines.push("生成時刻: " + new Date().toISOString());
  lines.push("");
  lines.push("```");
  for (const f of list) {
    lines.push(f.rel);
  }
  lines.push("```");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n"));
  console.log("Wrote", OUT);
}

main();
