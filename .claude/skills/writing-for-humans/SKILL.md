---
name: writing-for-humans
description: Write dense human-facing text: READMEs, docs, PR and commit bodies, chat replies. Use before drafting or editing anything a human reads.
---

# Writing for humans

## The bar

Cut until removing one more word would lose a fact.

Write for a reader who works here. They know what a PR is, what ADO is, what `/handoff` does. Context you can assume is context you delete.

## Write fragments

Drop the subject and verb when the surrounding structure supplies them. `->` for sequence.

- `Push -> PR into dev-server`
- rather than: "Once you have finished, push your branch and then open a pull request into dev-server."

## Table when the rows share a shape

Every row carries the same fields, so a table. Rows of different shapes stay bullets. A two-column table with one row is a sentence in a costume.

## Put the why under the what

A step that invites a wrong move gets one sub-bullet naming what goes wrong. This is the densest content in the document and the first thing a careless compression pass deletes. Protect it, and let it run longer than the step it hangs off:

```
5. `/to-tickets`, same chat
   - `/to-spec` drops paths, snippets, prefactor candidates, and ruled-out options on
     purpose. Slicing runs on exactly those, so a fresh chat slices against a thinner map
```

Three words of instruction, twenty five of reason. That ratio is correct when the reason is what stops the mistake.

## Keep the nouns, cut the connective tissue

Compressing a paragraph, the concrete lists survive and the framing goes. "The seam map, prefactor candidates, blast-radius notes, and ruled-out options" is the payload. "It is important to carry forward the relevant context" is the wrapper.

## Point, don't copy

One line naming a file beats a summary of it. The summary drifts, the pointer does not.

## Name the gaps

A document describing only what works reads as a description of a finished thing. A short "Not in place yet" list is often worth more than the section above it.

## Diagram what is graph-shaped

Sequence and hierarchy read fine as text. Reach for mermaid on a fan-out, a cycle, or a cross-edge that a flat list would hide.

## In chat

Same rules, plus: the conclusion goes before the reasoning that produced it. Tables and bullets belong in a reply as much as in a file.

## Before handing it over

Name the three weakest lines, then delete or defend each one. A pass that names none did not happen.
