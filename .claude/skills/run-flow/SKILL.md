---
name: run-flow
description: Replay a saved local flow headed, then hand the live browser to the tester.
disable-model-invocation: true
---

Do not use technical jargon. I am a QA engineer, not a developer. My only mode of access is through the Claude App. Assume I have no knowledge of what's in this repo.

# Run flow

A **flow** replays a recorded run of one application against dev and then holds, with the
browser open, on the state it drove to. Running one leaps the tester past the setup clicks
and lands them where they came to test. The tester drives from there. You launch it and
report.

A flow asserts nothing, so it cannot pass or fail. The durable assertions live in the e2e
suites (`playwright-e2e` skill).

Flows live in [`.scratch/reusable-flows/<application>/<slug>.js`](../../../.scratch/reusable-flows/README.md).
That README holds their conventions and the template.

## Input

The tester gives you three things in one sentence, for example "in the Data Hub UI, with the
user: username = jackvalent, password = Test1234".

- **Slug**: the flow name in kebab-case. Ask for it and wait if it is missing.
- **Application**: the directory the flow sits in, for example `data-hub-ui`. Take it when it
  is given. Otherwise search every application directory for the slug: run the single match,
  or list the matches and stop when more than one answers.
- **Username and password**: pass them to the run as environment variables, on the command
  line below. Never write a credential into a file, and never echo one back.

The credentials are only needed when the saved session has expired. A run that has a live
session ignores them.

## Run

1. **Resolve** to `.scratch/reusable-flows/<application>/<slug>.js`. If the directory holds
   no flows, or the file is absent, list what does exist and stop. Run the named flow or
   none: a near match is a different flow. A repo with no flows at all is the normal state
   of a fresh clone, so point the tester at the `playwright-codegen` skill to record one.
2. **Launch it in the background.** The script blocks at `page.pause()`, so a foreground run
   holds the session until the tester closes the browser:

   ```bash
   DATAHUB_DEV_USER=<user> DATAHUB_DEV_PASSWORD=<password> node .scratch/reusable-flows/<application>/<slug>.js
   ```

3. **Read the log.** A flow that reaches the end state prints nothing and keeps running. A
   step that misses its element throws `TimeoutError` after 30 seconds and names the
   locator. Report that locator and the step it belongs to.
4. **Hand over.** Tell the tester the browser holds at the end state and is theirs to drive.

The run is done when the browser holds at the end state, or when you have named the step that
failed and why.

## When the run reports the two variable names

The saved session expired and the tester gave you no credentials. Ask for the username and
password, then run again. An expired session needs nothing else: `ensureSession()` signs in
again and the run only takes longer.

## Add a flow

The tester records the steps; you shape them into a flow file.

1. Record the flow with the `playwright-codegen` skill. The steps land in `.scratch/tmp/`.
2. Copy the recorded steps into `.scratch/reusable-flows/<application>/<slug>.js`, built on
   the template in the reusable-flows `README.md`.
3. Keep the recorded steps only. The template already signs in, opens the browser headed,
   and holds at the end. Drop any recorded sign-in steps: `sign-in.js` owns them.
4. Delete the file in `.scratch/tmp/`. A recording that captured the sign-in holds the
   password in plain text.
5. Run the flow once to prove it replays.
