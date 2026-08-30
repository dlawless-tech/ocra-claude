---
name: generate-story-test-plan
description: Write a story's test-plan.md next to its spec: the data and accounts to seed into the dev environment, then the ordered scenarios that exercise the story, each naming the test cases it validates. AI scenarios first (the agent can seed and run them, regression and one-off Playwright), then human scenarios. Use when QA needs a runnable test plan for a Story, or playwright-e2e needs one to generate against.
disable-model-invocation: true
---

Turn one Story into a **runnable test plan**: the setup a tester or an agent performs first, then the ordered scenarios that exercise the Story, each naming the test cases it validates. The plan is the bridge between the cases and a real run. It answers "what state do I stand up, and in what order do I walk through the Story", where the cases answer "what does each check verify".

This is not [`generate-test-cases`](../generate-test-cases/SKILL.md). That skill writes the atomic, reusable **cases** into ADO, one per criterion and type. This skill writes the **plan** for one Story: the setup and the scenarios that run those cases against the live app. A scenario cites the cases it covers by title; it does not restate them. `playwright-e2e` reads this plan to generate the browser tests.

## Inputs

Ask in chat for the Story id. Read the rest.

| Input | Carries |
| --- | --- |
| Story description and ACs | What this Story delivers, and the acceptance criteria the scenarios must cover. `docs/work-tracking/issue-tracker.md` holds the `az boards` read commands |
| `.scratch/features/<slug>/test-cases.md` | The feature's cases. A scenario cites these by title. If absent, run `generate-test-cases` first |
| `<feature>/backend-details.md`, `frontend-details.md` | The data structures and the stores (which tell you what to seed), the views and flows (which shape the scenario steps) |
| `docs/dev/MAP.md` | How to run the app and seed the dev environment: which stores exist, how accounts are provisioned, LOCAL mode and the BFF. Read it for the concrete seeding mechanics rather than inventing them |

## Setup

The plan opens with the setup every scenario depends on, so a tester stands the state up once. Two parts.

**Data.** What to seed, and into which store. Name the store (the transactional database, or the analytical store) from `backend-details.md`, and the rows or entities each scenario needs. Where the data is computed rather than entered (a nightly batch, a derived record), say whether to run the compute or to pick an existing athlete who already carries the state.

**Accounts.** Which accounts to use, and their characteristics. State whether to initialize a fresh account or pull an existing one from the current system, and the traits each scenario keys on. Characteristics are the point: "an athlete with earned achievements across several types", "an athlete with none", "a user with search access who is not the owner". A negative or access-control scenario needs the account that fails the check, so name it here.

Give each setup item an id (`DATA-A`, `ACCT-A`), and let the scenarios reference it, so one setup serves many scenarios.

## Scenarios

A scenario is one walk through the Story: its own preconditions, its steps, and the cases it validates. Order the scenarios so the setup builds naturally, and **list every AI scenario before any human scenario**.

**An AI scenario** is one the agent can run end to end: seed the state, drive the app, and assert the result. Two kinds sit here.

- **Regression scenarios** validate regression-routed cases. The agent generates a Playwright test that is **saved to the regression suite** and reruns on every change.
- **One-off scenarios** are checks worth running once but not keeping: a state hard to reproduce, a spot confirmation. The agent drives them through Playwright and **does not save** them to the suite.

Mark each AI scenario as saved-to-regression or one-off, so the reader knows which tests persist.

**A human scenario** is one past the agent's reach: layout and visual judgment, a real device, an un-mockable third party, intent the machine cannot assert. It validates manual and exploratory cases.

Each scenario carries:

- **Goal** one line, the slice of the Story it exercises.
- **Setup** the `DATA-` and `ACCT-` ids it depends on, plus any state unique to it.
- **Steps** the walk through the app, action by action.
- **Validates** the case titles it covers, from `test-cases.md`, and the criteria they trace to.

## The shape

Write `test-plan.md` in this order: the Story and its ACs at the top, then Setup, then Scenarios with every AI scenario first.

```markdown
# 9488 Data Hub UI, Athlete Achievements: test plan

Story 9488. Feature: Athlete Achievements. Cases: ../test-cases.md.

## Setup

### Data
- `DATA-A` An athlete with earned achievements across Meet Milestone, First, and Time Standard, in the analytical store. Pick an existing athlete who already carries the state; the nightly batch computes it.
- `DATA-B` An athlete reachable by search with no earned achievements.

### Accounts
- `ACCT-A` Sign in as the owner of `DATA-A`. Athlete, Data Hub User role.
- `ACCT-B` Sign in as a user with athlete search access who is not the owner.

## Scenarios

### AI, saved to regression, View my own achievements
- goal: The owner opens their Achievements page and sees the full catalog, earned bright and pending dimmed.
- setup: ACCT-A, DATA-A.
- steps:
  1. Sign in as ACCT-A. Open Athlete Profile, open the Achievements sub-navigation.
  2. Read the badge grid.
- validates:
  - "Badge grid: earned badges render bright with an earned date" (AC: full catalog shown)
  - "Badge grid: pending badges render dimmed with no date" (AC: pending dimmed)

### AI, one-off, Share affordance keys on ownership
- goal: Confirm Share shows only on the owner's own page.
- setup: ACCT-A and DATA-A; ACCT-B for the negative pass.
- steps:
  1. As ACCT-A, open own Achievements. Confirm Share on an earned badge.
  2. As ACCT-B, open the same athlete. Confirm no Share.
- validates:
  - "Share: the option appears only to the owner" (AC: sharing is owner-only)

### Human, Badge visual treatment
- goal: The dimmed and bright badge treatment reads correctly and matches the UX intent.
- setup: ACCT-A, DATA-A.
- steps:
  1. Open the Achievements page and judge the earned-versus-pending treatment.
- validates:
  - "Badge presentation: dimmed treatment is legible" (manual, layout judgment)
```

## Done when

- `test-plan.md` sits at `.scratch/features/<slug>/<story-slug>/test-plan.md`, next to the Story's `spec.md`.
- Setup names its data and accounts with ids and characteristics, and every scenario references them.
- Every AI scenario sits before every human scenario, and each AI scenario is marked saved-to-regression or one-off.
- Every scenario names the cases it validates, by their titles in `test-cases.md`.
- Every acceptance criterion on the Story is covered by at least one scenario.
