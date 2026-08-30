# Test case formats

Test cases represent actionable validation steps within a particular user experience or "testing suite". This file defines what goes in a test case, the tags on it, and the staging file that holds the cases.

## The case

Every case, whatever its route, carries five things.

| Part | Holds |
| --- | --- |
| Title | `<Functionality>: <concise validation>`. Human readable, not a slug. The functionality names the subject, the validation names what this case checks. e.g. `Badge content: an achieved badge shows image, label, and earned date` |
| Route | `regression`, `manual`, or `exploratory` |
| Tags | The four below |
| Preconditions | The state before step 1, kept out of the steps |
| Steps | Action paired with expected result, one to one |

**Atomic steps.** One action, one expected result, per row. A failure then localizes to one row. Never bundle a long expected result at the end.

**Preconditions stay out of the steps.** A regression case states the seed or fixture state. A manual case references a shared precondition, so one setup serves many cases. Shared steps are an ADO primitive, created at push by `push-testplan.js`.

**Write by destination.**

- **Regression** is precise and mechanical: exact inputs, exact states, including the API and database assertions. A test-code generator reads it as a spec, so it cannot infer what you leave out.
- **Manual** is concise: brief a colleague. A human fills the obvious steps an agent cannot.

## Tags

Tags are the AI's plumbing, the cross-cutting filters over the functional suites. QA navigates ADO by plan and by suite; the tags answer "show me every negative case", "show me the manual pass", across suites.

| Tag | Example | The filter it builds |
| --- | --- | --- |
| `flow:<feature>` | `flow:athlete-achievements` | The whole feature, across suites and stories |
| `view:<view>` | `view:profile-achievements` | One screen. Values come from the UI doc |
| `type:<type>` | `type:negative` | One case type. `positive`, `negative`, `edge`, or `boundary` |
| route | `regression`, `manual`, `exploratory` | The regression set. The manual set |

The criterion is not a tag. It names the case in the description instead, so a case traces back to its acceptance criterion without a tag per criterion.

## Applications, as configurations

The tested application is not in the suite name, not in the title, and not a tag. It is a **configuration** on the case. Each application is one ADO test configuration: Data Hub, Mobile App, SWIMS. A case gets a test point per configuration it runs in, so the same case runs and passes or fails once per application.

- **List the applications in an `apps:` field** on the case, e.g. `apps: Mobile App` or `apps: Mobile App, Data Hub`. The push turns each into a configuration on the test point.
- **Identical validation across applications is one case, several configurations**, never a case per application. When the steps genuinely differ between applications, write a case each in the same suite, one configuration apiece.
- **A story targets one application**, but you draft the Feature in one pass. Where the same validation runs on two applications, write one case and list both in `apps:`; each becomes a configuration on the case, not a duplicate. See [`push-testplan.js`](push-testplan.js).

## The staging file

Path: `.scratch/features/<slug>/test-cases.md`. One file per Feature. A machine copy, not for QA. It holds the reviewed cases so the push is a copy, and it survives a compaction mid-review. `push-testplan.js` reads it.

Group by suite. A `##` heading is a functional suite, and its cases sit under it. Name each precondition once at the top, then reference it by id. Each case names its criterion in an `ac:` field, which the push writes into the description, not into a tag. Each case names the delivery story or stories it traces to in a `story:` field, which the push turns into a `tested-by` link. Split action from expected with `=>`.

```markdown
# Swimmer Goals: test cases

Feature 9413. Plan: Swimmer Goals.

## Preconditions
- `PC-A` Sign in as account A. Athlete, Data Hub User role, personal bests in several events, no goals.
- `PC-B` Sign in as account B. One unachieved goal, future target date, on an event with a personal best.

## Set a goal on an event
As an athlete, I want to set a target time on an event, so that I have something to train toward.

### Set a goal: saving with an empty target time shows an error
- route: regression
- tags: flow:swimmer-goals, view:goal-form, type:negative
- ac: AC2 an athlete cannot save a goal with no target time
- story: 9413
- apps: Data Hub
- pre: PC-A
- steps:
  1. Open the goal form for 100 Free SCY. Leave the target time empty. Save. => A "target time required" error appears; the form stays open.
  2. Open the goal tracker. => No goal appears on the 100 Free SCY row.

### Set a goal: a zero target time is rejected
- route: regression
- tags: flow:swimmer-goals, view:goal-form, type:boundary
- ac: AC2 an athlete cannot save a goal with no target time
- story: 9413
- apps: Data Hub
- pre: PC-A
- steps:
  1. Open the goal form for 100 Free SCY. Type 00:00.00. Save. => The save is rejected; no goal with time 00:00:00 is written to swims.PersonGoal.
```

## Done when

- Every case sits under a `##` functional suite heading.
- Every case has a human-readable title in the `Functionality: concise validation` shape, not a slug.
- Every case carries `flow:`, `view:`, `type:`, and a route, plus an `ac:` field naming its criterion, a `story:` field naming the delivery story it traces to, and an `apps:` field naming the applications it runs in.
- Every case names its precondition, and pairs each action with one expected result.
- Every precondition a manual case cites is defined once at the top of the file.
