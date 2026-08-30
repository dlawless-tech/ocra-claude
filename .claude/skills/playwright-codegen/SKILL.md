---
name: playwright-codegen
description: Capture a data-hub-ui flow with Playwright codegen into a replayable leap-up script.
disable-model-invocation: true
---

Do not use technical jargon. I am a QA engineer, not a developer. My only mode of access is through the Claude App. Assume I have no knowledge of what's in this repo.

# Playwright codegen

`codegen` opens a real browser plus the Playwright recorder. A human drives the browser;
codegen writes the Playwright steps for what they do. Your job here is to launch codegen for
that human, then shape the recorded steps into a flow that replays headed and fast-forwards a
human to a starting state. This is not `playwright-cli` (the agent's headless driver), and
not the test runner. You capture and shape the steps; the human at the window is the tester.

Codegen targets the dev environment: `https://data-hub-ui-dev.swimsmember.org/landing`.

## Input

The tester gives you the whole request in one sentence, for example "in the Data Hub UI, with
the user: username = myusername, password = Test1234".

- **Slug**: kebab-case, naming the flow by what it does, for example `swimmer-search`. Ask
  for it and wait if it is missing. Never invent one: the slug names the recording, then the
  flow at `.scratch/reusable-flows/<application>/<slug>.js`, then the argument the tester
  passes to the `run-flow` skill.
- **Application**: the app being recorded, for example `data-hub-ui`.
- **Username and password**: pass them to the sign-in helper as environment variables, in
  step 1 below. Never write a credential into a file, and never echo one back.

## 1. Start signed in

Mint a session first, so the recorder never sees the sign-in and the recording never holds a
password:

```bash
DATAHUB_DEV_USER=<user> DATAHUB_DEV_PASSWORD=<password> node .scratch/reusable-flows/sign-in.js
```

That writes `.scratch/tmp/auth.json`, and reuses a live session rather than signing in again.

## 2. Record

`yarn workspace` runs the command from `src/e2e/data-hub-ui-e2e`, not the repo root. So give
`-o` and `--load-storage` absolute paths. Relative paths fail with ENOENT.

```bash
yarn workspace data-hub-ui-e2e exec playwright codegen --target javascript --load-storage "<abs-path>/.scratch/tmp/auth.json" -o "<abs-path>/.scratch/tmp/<slug>.js" https://data-hub-ui-dev.swimsmember.org/landing
```

Two windows open, the browser and the recorder, and the browser is already signed in.
**Recording starts active** - codegen captures from the first click. So the human:

1. Clicks the recorder's **Record** button to stop capture.
2. Reaches the starting state. These steps are not captured.
3. Clicks **Record** again to start capture, then walks the flow to record.
4. Clicks **Record** to stop, then closes the browser. The steps are now in the file.

Step 1 is not optional. Capture that stays on writes every step before the flow into the
file, and a session that has expired mid-record puts the password there in plain text. If
that happens, delete the file and record again.

## 3. Promote it to a flow

Move the steps into `.scratch/reusable-flows/<application>/<slug>.js`, built on the template
in that directory's [`README.md`](../../../.scratch/reusable-flows/README.md), then delete
the file in `.scratch/tmp/`. The tester replays it by slug with the `run-flow` skill.

Run it once to prove it replays. The script holds the dev host in each `page.goto(...)`, so
change the host there to leap up in another environment.

The same recording can seed a durable e2e test: record with `--target playwright-test`
instead, and hand it to the dev path (`playwright-e2e` skill).
