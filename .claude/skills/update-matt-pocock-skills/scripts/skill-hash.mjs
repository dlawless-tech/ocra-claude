#!/usr/bin/env node
// Mirrors computeSkillFolderHash from the skills CLI: sha256 over every file in
// the skill folder, sorted by relative path, hashing path then content.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function collect(base, cur, out) {
  for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
    const full = path.join(cur, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      collect(base, full, out);
    } else if (entry.isFile()) {
      out.push({
        relativePath: path.relative(base, full).split("\\").join("/"),
        content: fs.readFileSync(full),
      });
    }
  }
}

function folderHash(dir) {
  const files = [];
  collect(dir, dir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const hash = createHash("sha256");
  for (const f of files) {
    hash.update(f.relativePath);
    hash.update(f.content);
  }
  return hash.digest("hex");
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const mode = process.argv[2];
const skillsDir = path.resolve(arg("--skills-dir", ".claude/skills"));
const lockPath = path.join(skillsDir, "skills-lock.json");
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));

if (mode === "verify") {
  const drifted = [];
  const missing = [];
  for (const [name, entry] of Object.entries(lock.skills)) {
    const dir = path.join(skillsDir, name);
    if (!fs.existsSync(dir)) {
      missing.push(name);
      continue;
    }
    if (folderHash(dir) !== entry.computedHash) drifted.push(name);
  }
  const total = Object.keys(lock.skills).length;
  if (missing.length) console.log(`missing: ${missing.join(", ")}`);
  if (drifted.length) console.log(`locally edited: ${drifted.join(", ")}`);
  if (!missing.length && !drifted.length) console.log(`clean: ${total}/${total} match the lock`);
  process.exit(drifted.length || missing.length ? 1 : 0);
}

if (mode === "write") {
  const upstream = path.resolve(arg("--upstream", ""));
  if (!upstream) throw new Error("write mode needs --upstream <clone path>");

  // Resolve each local skill folder to its upstream bucket. A folder with no
  // upstream counterpart is a local skill and stays out of the lock.
  const buckets = fs
    .readdirSync(path.join(upstream, "skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const skills = {};
  const localOnly = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const bucket = buckets.find((b) => fs.existsSync(path.join(upstream, "skills", b, name, "SKILL.md")));
    if (!bucket) {
      localOnly.push(name);
      continue;
    }
    const prev = lock.skills[name] ?? {};
    skills[name] = {
      source: prev.source ?? "mattpocock/skills",
      sourceType: prev.sourceType ?? "github",
      skillPath: `skills/${bucket}/${name}/SKILL.md`,
      computedHash: folderHash(path.join(skillsDir, name)),
    };
  }

  fs.writeFileSync(lockPath, JSON.stringify({ version: lock.version ?? 1, skills }, null, 2) + "\n");
  console.log(`wrote ${Object.keys(skills).length} entries to ${lockPath}`);
  if (localOnly.length) console.log(`left out (no upstream counterpart): ${localOnly.join(", ")}`);
  process.exit(0);
}

console.error("usage: skill-hash.mjs verify|write --skills-dir <dir> [--upstream <clone>]");
process.exit(2);
