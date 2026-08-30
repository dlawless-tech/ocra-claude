---
name: generate-test-cases
description: Turn a whole Feature into ADO Test Cases. Derive the functional experiences into suites, grill each suite for positive, negative, edge, and boundary cases, carry multi-application coverage as configurations, review in chat, then stage for Azure DevOps. Use when QA asks for the test cases for a Feature.
disable-model-invocation: true
---

Break down one Feature in ADO into test suites, based on user experience, and test cases. You gather the inputs, derive the suites, grill the cases, raise what matters in chat, and on QA's go write the structure to a local markdown file.

I am a QA. The words tag, suite, and configuration are the ADO layer. Local files and structures within this repo are a developer's purview. Speak to me in-chat in terms of flows and steps: a screen, what you click, what should happen.

## Initialize Workspace

Git checkout the `dev-server` branch if you are not already in it. Do a fresh pull to make sure we have the latest context.

## Extract Feature Context

Expect the Feature id, name, or slug from the chat. Ask if you do not have it.

Read the following from the ADO working tree (`docs/work-tracking/issue-tracker.md` holds the `az boards` read commands and the auth):
- ADO Feature description: The functional stories (the experiences the Feature delivers), the catalog and rules, the display order
- Each child Story description and ACs: The acceptance criteria that become cases. Reach the children by the Feature relations whose `rel` is `System.LinkTypes.Hierarchy-Forward`

Based on the ADO Feature name, locate the most semantically similar feature slug within the `.scratch/features/<feature-slug>` directory. From that directory read the following:
- `<feature>/requirements.md`: The capability, the definition of success, the functional requirements
- `<feature>/frontend-details.md`, the UI doc: The views and their entry and exit flows. The `view:` tag values
- `<feature>/backend-details.md`, the system doc: The data structures, the field constraints, the auth and roles, the endpoints

Guard: if the feature folder or a detail doc is absent, say which and stop. Drafting from the criteria alone drops the negative, boundary, and access-control cases the docs seed.

## Group the criteria into suites

Break the Feature's criteria into **functional suites** before drafting. A suite is one coherent experience, an "as a, I want, so that", with its criteria grouped under it.
- **ADO stories split by application or by layer**, so one experience may scatter across several stories; regroup acceptance criteria by experience, not by the story that carried it.
- **Take the suite names from the Feature's functional stories.** The Feature description usually lists them ("View my own achievements", "Share my own achievement"). Name each suite for the function, a concise phrase, and leave the application out of the name.
- **The same suite holds every application's cases** for one experience. The application rides on the case as a configuration, not on the suite.
- **A cross-cutting concern is a suite too** where it belongs to no single experience: error handling when the service is down, access control across the page, accessibility. Give it a functional name and group its criteria there.

Suite naming, tags, and the case shape live in [`FORMATS.md`](FORMATS.md).

Present the final list and overview to me. Once I acknowledge, move to the next step.

## Brainstorm test cases within a single suite

Pick a suite, to flesh out the test cases within each suite. This is a brainstorming exercise where you take the first go, and then we refine together in-chat.

First, ideate and reason through options yourself. Start wide by generating a fully-encompassing list on your own, and then remove test cases until you are left with only what is practical/reasonable to test.

- Good test cases should fail before the feature's implementation is complete. The testing guidelines are defined in the [testing.md](../../rules/testing.md) rule file.
- Work the test case types **in this order**, and stop where the criterion runs out of risk. The type rides in a `type:` tag; the criterion rides in the case description, so the title stays a plain-English phrase of the functionality and the check.

  1. **Positive** always. The happy path first, then any other valid input the criterion allows.
  2. **Negative** always. Invalid input, missing input, wrong role, an action the viewer may not take.
  3. **Edge** when the area is high-risk: authorization, ownership, data integrity, an irreversible or one-way action, money. Skip it for a low-risk read.
  4. **Boundary** on request. Add it when the criterion names a limit (a min, a max, a threshold, a count) and you or QA calls for it: the value at the limit, one below, one above.

- When the same validation runs on more than one application (Data Hub and the Mobile App, say), write one case and list both in its `apps:` field. Write a second case only when the steps genuinely differ between applications.
- **Route each case.** Lean to regression: one QA cannot run everything by hand, and Playwright drives the UI and asserts API and database state directly.

| Route | Take it when | Then |
| --- | --- | --- |
| **regression** | Mechanically verifiable: field validation, navigation and rendering, button and page flow, backend and database side effects | Feeds the Playwright suite. Precise and mechanical |
| **manual** | Human judgment or intent, not mechanical correctness. Plus a little redundant positive-path sanity. Plus anything past Playwright's reach: layout judgment beyond existence, real filesystem or OS, un-mockable third party like live payment or real email, timing tied to the real clock | A human runs it. Concise |
| **exploratory** | A mission worth a time-boxed session, not scripted steps | A charter: mission and time box. Keep it light |

Finally, Present your batch of test cases to me in a structured, tabular view, so I can review it as a whole.   I will also ask questions or push back where needed.

## Grill in-chat, raise only what matters

Present the draft per suite, and per criterion within it, in concise, tabular view. Lead each criterion with one or two lines that **raise** what deserves QA's eye: a likely defect the criterion glosses over, a gap it left open, a routing call you want confirmed. Then list the cases. Raise anything worth a human's look, not confidence for its own sake.

After that, pull me into the brainstorm. Ask questions or thoughts you may have in batches, like in a `/grilling` session, with less depth, and make sure to include your recommendation for each. We will triage/refine here: edit, merge, discard, add. Fold every change back into the draft before you stage.

## Stage test cases locally

Write the reviewed cases to the staging file, so the push is a copy and survives a compaction mid-review. Path and shape in [`FORMATS.md`](FORMATS.md). Do not stage decisions or brainstorming iterations, only stage explicit testing/validation content.

Repeat the Brainstorm, Grill, and Stage steps for the rest of the test suites.

## Push and write to ADO

Once you get confirmation from me that we are finished, push `.scratch/features/<slug>/test-cases.md` to `dev-server`. Then create the Test Plan in ADO for the first time by running the `push-testplan.js` script, and read its per-suite verification and `DONE` line:

```bash
node .claude/skills/generate-test-cases/push-testplan.js .scratch/features/<slug>/test-cases.md
```

The script is first-time-or-resume only, and it holds the ADO call shapes and traps. If it stops because a plan of that name already exists, this flow is done; changing cases on an already-pushed plan is a separate job outside this skill.

## Done when

- Every criterion sits in a functional suite, with its cases, each routed, across the types that apply.
- Every case clears the bars in `FORMATS.md`: a human-readable title, the tags, an `ac:` field, a precondition, atomic steps, and the applications it runs in.
- The staging file holds every reviewed case, grouped by suite, at `.scratch/features/<slug>/test-cases.md`.
- The ADO Test Plan exists, every suite and case pushed, and the script's verification shows no case missing a test point.