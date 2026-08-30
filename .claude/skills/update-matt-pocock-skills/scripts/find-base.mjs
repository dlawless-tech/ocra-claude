#!/usr/bin/env node
// Finds the upstream commit the installed skills were last synced from, by
// walking main until a commit whose SKILL.md blobs match every local one.
// Skills are matched by folder name, so a skill that changed bucket upstream
// still resolves.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const skillsDir = path.resolve(arg("--skills-dir", ".claude/skills"));
const upstream = path.resolve(arg("--upstream", ""));
const limit = Number(arg("--limit", "600"));
if (!upstream) throw new Error("needs --upstream <clone path>");

const git = (...args) => execFileSync("git", args, { cwd: upstream, encoding: "utf8", maxBuffer: 1 << 28 });

const lock = JSON.parse(fs.readFileSync(path.join(skillsDir, "skills-lock.json"), "utf8"));
const names = Object.keys(lock.skills);

// Local SKILL.md blob hashes, keyed by skill name.
const localBlob = {};
for (const name of names) {
  const p = path.join(skillsDir, name, "SKILL.md");
  if (!fs.existsSync(p)) continue;
  localBlob[name] = git("hash-object", p).trim();
}
const tracked = Object.keys(localBlob);

const commits = git("log", "--format=%H %ad", "--date=short", "main").trim().split("\n").slice(0, limit);

let best = null;
for (const line of commits) {
  const [sha, date] = line.split(" ");
  const tree = git("ls-tree", "-r", sha, "skills/");
  const byName = new Map();
  for (const row of tree.split("\n")) {
    if (!row.trim()) continue;
    const [meta, filePath] = row.split("\t");
    if (!filePath.endsWith("/SKILL.md")) continue;
    byName.set(path.basename(path.dirname(filePath)), meta.split(/\s+/)[2]);
  }
  const matched = tracked.filter((n) => byName.get(n) === localBlob[n]);
  if (!best || matched.length > best.matched) {
    best = { sha, date, matched: matched.length, missed: tracked.filter((n) => byName.get(n) !== localBlob[n]) };
  }
  if (matched.length === tracked.length) {
    console.log(JSON.stringify({ exact: true, base: sha, date, matched: matched.length, of: tracked.length }, null, 2));
    process.exit(0);
  }
}

console.log(
  JSON.stringify(
    {
      exact: false,
      base: best.sha,
      date: best.date,
      matched: best.matched,
      of: tracked.length,
      // These differ at the best commit: either locally edited, or the base
      // predates the scanned window.
      differing: best.missed,
    },
    null,
    2,
  ),
);
process.exit(1);
