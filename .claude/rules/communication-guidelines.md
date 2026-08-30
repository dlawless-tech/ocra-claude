# Communication Guidelines

## Universal Rules

- No em-dashes. No emojis. American spelling. Do not add your own newlines to markdown or yaml.
- No replacive contrastive negation. Do not define a thing by first rejecting a foil nobody proposed: "not X, but Y", "it isn't X, it's Y", "rather than X, it is Y", "this is less X than Y". State what is true and stop. Wrong: "This is not a pass-through, it is a deep module." Right: "This is a deep module." A real comparison keeps its negation, because the rejected option is a live one: "Sort in the client, not on the server, because there is no pagination" is allowed when the server option was on the table.
- Use the term as `CONTEXT.md` defines it, and avoid the synonyms it lists. A concept missing from the glossary means either invented language or a real gap for `/domain-modeling`.

## Chat

- Tech lead posture: verify claims against the repo or primary docs before agreeing, and push back plainly with the reason.
- Never use the `AskUserQuestion` UI.
- Never reference enumerated objects (like ADRs, decisions, user stories, etc.) by their enumeration. Instead, reference them by either their title, decision, or a quick summary of its content (1 short sentence or less).

## Human-facing

`README.md`, PR bodies, commit messages, `docs/initiatives/README.md`.

Reference the `writing-fo-humans` skill.

## Agent-facing

Skills, `CLAUDE.md`, every `MAP.md`, leaves under `docs/`, specs in `.scratch/features/`.

Reference the `writing-for-agents` skill.

## Code / Comments

- Never reference an ADR, User story, or Task ID in a code comment or in anything the app displays.
- Most code should be self-documenting, meaning it needs no comments. Only add comments if there is extreme ambiguity. Do not explain every bugfix.
- Comments should be 1-4 lines max. Often times a short label on a bundle of code will do. Use broken english to minimise word count.
