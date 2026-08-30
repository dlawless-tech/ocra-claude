---
name: grill-story
description: Grill one layer's User Story, holding the session inside that layer instead of straying into its sibling stories. Use when stress-testing a Data, API, or UI story from the issue tracker.
disable-model-invocation: true
---

Run a `/grilling` session on a single User Story, using the `/domain-modeling` skill, held inside that Story's layer.

The user gives you a work item id. If they do not, ask for one before anything else.

## Before the first round

1. Read the Story, its parent Feature, and every sibling Story under that Feature, bodies and acceptance criteria both. `docs/work-tracking/issue-tracker.md` has the commands. The siblings are the fact source that keeps cross-layer questions off the frontier.
2. Read `docs/work-tracking/story-layers.md`. Its disposition rule governs every round: each frontier question is asked, resolved, or filed, and the choice is made before the question reaches the user.
3. Say which layer you are in and what you are treating as settled, in two or three lines, before Q1.

## Where the Story disagrees with the repo

An acceptance criterion can be stale: a settled ADR may already have replaced it. Surface the conflict and grill against the ADR, not against the criterion. Getting the Story corrected on the board is the human's call, not a write this session makes.

## Before you declare shared understanding

List every dependency you filed, each with its assumption, its owning Story, and what breaks if it is wrong. A session that reached the empty frontier by quietly assuming its way across a layer boundary is not done.
