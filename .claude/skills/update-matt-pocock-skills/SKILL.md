---
name: update-matt-pocock-skills
description: Merge the latest mattpocock/skills release into .claude/skills, keeping any local edits.
disable-model-invocation: true
---

# Update Matt Pocock's Skills

Bring the installed skills in `.claude/skills/` up to the newest upstream release, three-way merging anything edited locally rather than overwriting it.

Sync by hand rather than with `npx skills update`. The installed layout keeps the skills and `skills-lock.json` under `.claude/skills/`; the CLI from 1.5 on expects the lock at the repo root and installs into `.agents/skills/`, so its updater reports nothing to do and, once pointed at the right lock, relocates the whole install.

Upstream ships two buckets, `skills/engineering/` and `skills/productivity/`. `in-progress/`, `misc/`, and `deprecated/` do not ship, so a skill graduating out of `in-progress/` arrives as a new skill rather than an update.

## 1. Set up

Clone upstream somewhere disposable (`$CLAUDE_JOB_DIR/tmp` when running as a background job, else `.scratch/tmp/`):

```bash
git clone https://github.com/mattpocock/skills.git "$TMP/upstream"
```

Then confirm `.claude/skills` is committed and clean, so git is the rollback. Report a dirty tree and ask how to proceed before writing anything.

**Done when:** a full clone with tags exists, and `git status --porcelain .claude/skills` has been read.

## 2. Find the base

The base is the upstream commit the install was last synced from. Everything downstream keys off it.

```bash
node .claude/skills/update-matt-pocock-skills/scripts/find-base.mjs \
  --skills-dir .claude/skills --upstream "$TMP/upstream"
```

`exact: true` gives the base and means no `SKILL.md` was edited locally. `exact: false` lists the skills that differ at the closest commit: raise `--limit` and rerun, and treat whatever still differs as locally edited.

**Done when:** a base SHA is in hand, and each installed skill is either matched to it or named as differing.

## 3. Classify local edits

`find-base` reads only `SKILL.md`. Widen it to every file, and check the lock's own integrity:

```bash
git -C "$TMP/upstream" worktree add "$TMP/base" <base-sha>
node .claude/skills/update-matt-pocock-skills/scripts/skill-hash.mjs verify --skills-dir .claude/skills
```

Then diff each installed folder against the base tree. This loop resolves the upstream bucket by folder name, so it survives a skill moving bucket; reuse it in step 7 against the target tree:

```bash
for d in .claude/skills/*/; do
  n=$(basename "$d")
  u=$(find "$TMP/base/skills" -maxdepth 2 -type d -name "$n" | head -1)
  [ -n "$u" ] && diff -r -q "$u" "$d"
done
```

A folder with no upstream counterpart is a local skill (this one is). Leave it alone throughout.

`verify` reporting clean and the diff loop reporting nothing means a clean fast-forward, and step 5 is a straight copy. Say so plainly in the final report: it is the evidence that nothing of the user's was overwritten.

**Done when:** every installed file is classified as clean or edited, and the edited ones are listed by path.

## 4. Pick the target

```bash
git -C "$TMP/upstream" tag --sort=-creatordate | head -5
git -C "$TMP/upstream" diff --stat <latest-tag> main -- skills/
```

Take the newest release tag. When `main` carries skill changes beyond it, name them in the report and let the user choose the tag or `main`. Check out the target in the clone, and read `CHANGELOG.md` from base to target for the human-readable account of what moved.

**Done when:** the target ref is checked out, and the changelog entries between base and target have been read.

## 5. Merge

Work skill by skill, into `.claude/skills/<name>/`.

**Clean skills** take the target verbatim:

```bash
rsync -a --delete "$TMP/upstream/skills/<bucket>/<name>/" ".claude/skills/<name>/"
```

**Edited skills** get a three-way merge per file, so upstream changes land around the local edits:

```bash
git merge-file -p <local> "$TMP/base/skills/<bucket>/<name>/<file>" <target-file> > <merged>
```

Leave any conflict markers in place, and list the conflicted paths for the user rather than guessing an outcome.

Two cases the copy does not cover:

- **Renamed skills.** A folder present at base and absent at target was renamed or dropped. Confirm which from the changelog, then create the new folder, carry any local edits across with `git merge-file`, and delete the old one.
- **Dropped skills.** A skill demoted out of a shipping bucket stays on disk untouched. Flag it as frozen at its current version.

**Done when:** every installed skill matches the target except where a local edit or a conflict marker explains the difference.

## 6. Regenerate the lock

```bash
node .claude/skills/update-matt-pocock-skills/scripts/skill-hash.mjs write \
  --skills-dir .claude/skills --upstream "$TMP/upstream"
```

This rewrites `skillPath` from the target layout and recomputes each `computedHash` with the CLI's algorithm. Folders with no upstream counterpart are reported and left out.

**Done when:** the lock lists every upstream skill on disk and no local-only ones.

## 7. Verify and report

- Rerun the step 3 diff loop against `$TMP/upstream` at the target. Clean skills come back identical; edited ones differ only by the local edits.
- Rerun `skill-hash.mjs verify`. It reports clean for the full count, because the lock was just written from these files.
- After a rename, `grep -rn "<old-name>" --exclude-dir=.git .` to catch references in `CLAUDE.md` or `docs/`.
- `git -C "$TMP/upstream" worktree remove "$TMP/base"`.

Leave the result uncommitted for review. Report the base and target refs, a table of what changed per skill, any local edits preserved, any conflicts, and the untracked paths that need `git add`.

**Done when:** both checks have run and their results are stated in the report, including the count that came back clean.
