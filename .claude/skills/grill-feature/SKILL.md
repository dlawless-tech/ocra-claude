---
name: grill-feature
description: Grill a draft technical specification for one Feature into settled contracts, checked against the codebase, writing them into the feature's technical design as they settle.
disable-model-invocation: true
---

Run a `/grilling` session on a single Feature, over a draft technical specification the tech leads produced in a meeting.

This session settles the **contracts** between the horizontal layers and the shared components underneath them. An API stub is the contract between UI and API; the schema is the contract between API and Data. A fixed contract is what lets the layers be built in parallel, each one working against the contract without knowing the others' interiors. So the bar on every stub, table, and view is that a team could build against it without coming back to ask.

Logic inside a layer is not this session's business. Push on it only far enough to know the contract can carry it.

[`TECHNICAL-DESIGN.md`](TECHNICAL-DESIGN.md) holds the seven sections, their columns, and the bar each one clears. It is both the output format and the round plan: the frontier walks it top to bottom.

## Inputs

Ask in chat, before anything else, for the Feature id and slug, the PRD, and one of the two follow-up artifacts.

| Input | Carries |
| --- | --- |
| Feature id and slug | The slug names the directory; the id addresses the board. `docs/workspace.md` has why the id is passed and never inferred from the path |
| The PRD | Requirements and scope wider than this Feature, from the business |
| A draft technical specification, **or** a meeting transcript | What the tech leads settled in the follow-up meeting |

Create `.scratch/features/<feature-slug>/` and write the inputs into it as `prd.md` and `technical-draft.md` or `transcript.md`. Then create `technical-design.md` with the seven headings.

Given a transcript rather than a draft, write `technical-draft.md` from it in the seven-section shape before the first round. A transcript is thinner evidence than a draft: what the room converged on becomes a cell, what someone merely raised leaves that cell empty.

Read the Feature from the board for its acceptance criteria and its definition of done. `docs/work-tracking/issue-tracker.md` has the commands.

The draft stays in place, so the diff between it and `technical-design.md` shows what the grill changed.

Each round, write the decisions the user just settled into `technical-design.md` before asking the next round. Settled answers only: a recommendation the user has not confirmed stays in the conversation.

## Round 1 ratifies the draft

The draft came out of a room and a transcript, so its cells are candidate answers, not settled ones. Give every cell in it a disposition before Q1.

| The draft's cell is | Disposition |
| --- | --- |
| Matched by the glossary, an ADR, the SSDT project, or an endpoint that already exists | **Resolve.** Write it in and never ask |
| Stated, and the repo neither confirms nor contradicts it | **Ratify.** Goes into round 1 |
| Contradicted by the repo, or empty | **Ask.** Round 2 onward, with the conflict named |

Round 1 is every Ratify cell in one block, for a single pass of nos. A numbered question per cell would spend the room's whole hour on what it already agreed to.

Finding the facts that drive these dispositions is your job. Check the vocabulary against the glossary, the boundaries against the ADRs, the tables against the SSDT project, what a new endpoint must carry against the request pipeline, and the reads the SWIMS UIs already make against the shared UI library. Dispatch sub-agents and keep asking the rest of the round while they run.

Say which cells you resolved and against what, in two or three lines, before Q1.

## Rounds 2 onward

`/grilling` proper, over the Asks and the empty cells, walking the seven sections in order.

## Before you declare shared understanding

1. Every bar in `TECHNICAL-DESIGN.md`'s "Done when" holds.
2. Walk the acceptance criteria one at a time and name, for each, the structures, endpoints, and views that serve it. An AC with no contract behind it is an unfinished frontier, not a completed one.
3. Dispatch a sub-agent per lens over the finished document, each with no authority to add scope: contradiction between two sections, an actor or value with no row, a payload field with no structure, a conflict with an ADR or the schema. Bring the findings back as a round.
4. Say plainly what this session left unsettled and who has to settle it.
