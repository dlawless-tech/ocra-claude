# Technical design format

The shape of `technical-design.md`, for the `/grill-feature` session that fills it.

The seven sections run in **dependency order**, and that order is the frontier: each section treats every section above it as settled. Work top to bottom.

One row is one decision with exactly one answer. A cell you cannot fill is a question, not a hedge. Prose earns a place only where it carries an invariant a table cannot hold, and that is almost always a negative one.

Ids appear as plain integers in every sample. `docs/architecture/api-request-pipeline.md` has why nothing client side can sort or compare on one.

## 1. Definition

Two to four sentences naming the feature's central noun, what it holds, and what can be done to it. Pull the words from `CONTEXT.md`.

> A goal is a target time a swimmer sets for one event, with an optional target date and an optional Time Standard behind it. A goal can carry comments, and can be shared, which lets a coach read it and comment on it.

## 2. Data structures

Wire shapes first. Name each structure once and reuse the name everywhere below. Annotate every field of a structure that is written to as `(required)`, `(optional)`, or `(read-only)`.

| Structure | Fields |
| --- | --- |
| Goal Add | Person Id (read-only), Event Id (required), Goal Time (required), Target Date (optional), Is Shared (required), Time Standard Id (optional) |

Then storage, under the same heading. Every new table and every change to an existing one, field by field, with a description for each field whose meaning its name does not carry.

| Table | Field | Type | Description |
| --- | --- | --- | --- |
| `PersonGoal` | `IsShared` | `bit` | Whether a coach in the athlete's current club can read the goal and its comment thread |

Close the section by naming which structures are derived rather than stored, and what each is derived from.

## 3. Statuses, codes, and enumerations

Every status, code, and enumeration the feature introduces or reads, with its full value set. The third column does the work: a value is stored on the record, derived from a comparison, or the absence of a record.

| Value | Meaning | Where it lives |
| --- | --- | --- |
| `Achieved` | Best time is same or lower than goal time | On the goal |
| `Replaced` | Goal was achieved but a newer goal exists for the same event | Derived by comparing two goals on the same event, never carried on one |
| `Not Set` | Athlete has times in an event but no goal added yet | Not a value on a goal. The absence of one |

## 4. Visibility

Every actor who can reach the feature, including the ones who reach nothing. Visibility settles here rather than in the API Story, because it decides what the UI renders and what a read returns at all.

| Viewer | Sees | Can do |
| --- | --- | --- |
| The athlete | Every one of their own goals, shared or not | Read and write. The shared indicator shows which ones a coach can read |
| A coach in the athlete's club | Only the goals with `Is Shared` on | Read and comment. Never add, edit, or delete |
| Everyone else | Nothing, and no Goal Summary on the profile at all | Nothing |

Then, in prose: who "everyone else" covers, what each restricted view must not reveal, and when visibility is evaluated.

> The module's absence must not distinguish "this is not your athlete" from "this athlete shares nothing with you." Visibility is evaluated on every read against the athlete's current club.

## 5. UI views

The view inventory, which is what tells you how many UI Stories to cut. Layout, states, and interaction inside a view belong to that Story's own session.

| View | Appears | Shows |
| --- | --- | --- |
| Goal Summary | On the Profile landing page | A toggle between Active and Archived |

Where a view has modes, give each mode its content and its ordering.

## 6. UI flow

Every transition into and out of every view. A row whose action writes names the response that makes the target view reachable.

| From | Action | Goes to |
| --- | --- | --- |
| Summary | Click a goal | Drilldown |
| Goal Add | Save, which answers `201` carrying the new Goal Id | Drilldown |
| Goal Add | Cancel | Summary |

## 7. Endpoints

Per endpoint: the name, the verb and route, the response code, and one real sample payload. Concrete JSON settles field names, casing, and types in the room instead of at build time.

**AddSwimmerGoal**: `POST swims/personGoal/{MemberId}/goals`, answering `201`

```json
{"PersonId":23989,"EventId":32,"GoalTime":"48:04:000","TargetDate":"2026-11-01","IsShared":true}
```

## Done when

- Every field in a data structure appears in at least one endpoint payload, and every payload field traces back to a data structure
- Every value in section 3 has a disposition in "Where it lives"
- Every actor has a Visibility row, and every restricted row says what it must not reveal
- Every view has an inbound and an outbound UI flow row
- Every status shown in a sample payload is a value section 3 defines
