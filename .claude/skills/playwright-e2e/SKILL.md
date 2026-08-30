---
name: playwright-e2e
description: End-to-end tests for the web UIs, driven by the Playwright CLI (no MCP). Use when writing, running, or debugging an e2e test for data-hub-ui, turning an acceptance criterion into a browser test, or when a Playwright spec fails or flakes.
---

# Playwright e2e

An **e2e test** drives a real Chromium against a running UI and asserts on what the user
sees. It runs through the Playwright CLI. There is no MCP server and there will not be
one: the durable artifact is the spec file, and the CLI is what produces and replays it.
Solve "how do I test this acceptance criterion" once, write it into a spec, and reuse it
forever.

This skill holds the house rules: where the suite lives, how to run it here, and the
conventions a spec must follow. The mechanics of driving the browser and generating a
spec live in the `playwright-cli` skill. Load both.

One UI has a suite today: `data-hub-ui`, at [`src/e2e/data-hub-ui-e2e/`](../../../src/e2e/data-hub-ui-e2e/). Specs are TypeScript under `tests/`. The minimal shape is [`tests/smoke.spec.ts`](../../../src/e2e/data-hub-ui-e2e/tests/smoke.spec.ts).

## Two tools, one suite

| Tool | Package | Does |
|---|---|---|
| Spec runner | `@playwright/test` | Runs the durable suite. Specs live under `tests/`. |
| Browser driver | `@playwright/cli` | The agent's hands. Explores the page, generates the spec, heals a failing one. |

`@playwright/cli`'s `playwright-cli` binary replaces `codegen` on the agent path: `codegen`
needs a human at a window; the CLI does not. Humans may still record a smoke flow with
`codegen`; agents drive with `playwright-cli`.

## Run

All commands are from the repo root.

| To | Command |
|---|---|
| Run the whole suite | `yarn nx run data-hub-ui-e2e:e2e` |
| Run one file | `yarn workspace data-hub-ui-e2e exec playwright test tests/<name>.spec.ts` |
| Watch it drive the browser | `yarn workspace data-hub-ui-e2e exec playwright test --ui` |
| Step through one test | `yarn workspace data-hub-ui-e2e exec playwright test --debug` |
| Open the last report | `yarn workspace data-hub-ui-e2e exec playwright show-report` |

Playwright starts `data-hub-ui` on http://localhost:3000 itself, or reuses one already
running. The first run on a machine needs both browsers: `scripts/setup-playwright.sh`.

## Start every spec signed in

Import `test` and `expect` from [`tests/fixtures.ts`](../../../src/e2e/data-hub-ui-e2e/tests/fixtures.ts),
never from `@playwright/test`. The fixture opens `/landing` and confirms the session before
the test body runs. `devUser` names the persona, so a spec asserts against `devUser.name`
rather than a literal.

Locally there is no login to drive. `.env.local` sets `VITE_ENVIRONMENT_NAME=LOCAL`, which
makes `fetchSecurityInfoForIdp` return a fixed signed-in persona and never reach the BFF. The
`/landing/login` modal only redirects to the BFF on another host, so a signed-in visit to it
bounces back to `/landing`. Anonymous has no local state: a logged-out view needs LOCAL mode
off and the real BFF. Put the real `/bff/login` round trip in the fixture when that day comes.

## Author a test for an acceptance criterion

The full plan -> generate -> heal workflow is in the `playwright-cli` skill's
[test-generation reference](../playwright-cli/references/test-generation.md). In this repo:

1. **Start from the test plan.** QA writes it next to the story's `spec.md`
   (`generate-story-test-plan` skill), one scenario per acceptance criterion. If none exists,
   write it first via that skill.
2. **Generate.** Drive the flow with `playwright-cli`, which prints the Playwright code for
   every action. Collect it into a spec under `tests/`, named for the criterion, one
   `test()` per criterion.
3. **Query by role or label, never by CSS.** `getByRole('button', { name: 'Save' })`,
   `getByLabel('Season')`. These survive markup changes; class names do not.
4. **Assert the exact fact the criterion promises.** A test that only checks the page
   loaded is a defect. Assert the value, the row, the message it names.
5. **Use `expect(...)` web-first assertions**, which auto-wait. Never `waitForTimeout`.
6. **Run it, then run it again.** A spec that passes once and flakes once is not done.
   Trace is on for the first retry; read it with `show-report`.

## Notes

- data-hub-ui shares nothing with the SWIMS UIs (see `../../docs/conventions/data-hub-ui.md`). Serving it needs its own install and the FontAwesome token.
- Do not wire e2e into a pipeline yet. CI for tests waits on the quality-gates initiative.
- The three-tier model (API / interaction / visual) is still being decided against the
  characterization-test gate in the quality-gates initiative. Do not build a visual
  pixel-diff tier yet.
