---
name: ado-feature-pull
description: Pull an ADO Feature and its child stories, then write the feature-level functional requirements into .scratch/features/<slug>/requirements.md.
disable-model-invocation: true
---

Turn one ADO Feature into `requirements.md`, the feature-level statement of what the software does for the user. The Feature work item is the source of truth; the companion detail docs fill in and sometimes lag it. You pull, reconcile, distill to the functional, and write the fixed shape.

`requirements.md` carries **functional** requirements only, the behavior the athlete or user experiences. The **technical** design, endpoints, stores, data structures, auth mechanics, lives in the companion `backend-details.md` and `frontend-details.md`. A reader who wants "what does it do" reads requirements; a reader who wants "how is it built" reads the details. Keep the boundary sharp: an endpoint route, a controller name, a CDN prefix, a table shape all belong in the details, not here.

## Pull the Feature

Ask in chat for the Feature id. Read it and its children with `az boards`. The base read commands and auth live in `docs/work-tracking/issue-tracker.md`.

```bash
ORG=https://dev.azure.com/USASwimmingDevOps

# the Feature: title, state, area/iteration, description, and definition of done
az boards work-item show --id <feature-id> --org $ORG --query \
  '{title:fields."System.Title",state:fields."System.State",area:fields."System.AreaPath",iter:fields."System.IterationPath",desc:fields."System.Description",dod:fields."Microsoft.VSTS.Common.AcceptanceCriteria"}' -o json

# the child stories, the delivery decomposition
for id in $(az boards work-item show --id <feature-id> --org $ORG \
  --query "relations[?rel=='System.LinkTypes.Hierarchy-Forward'].url" -o tsv | grep -oE '[0-9]+$'); do
  az boards work-item show --id $id --org $ORG \
    --query '{id:id,title:fields."System.Title",state:fields."System.State"}' -o json
done
```

The Feature `System.Description` is the richest source: it usually spells out the capability, the functional stories, the catalog or rules, and the display order. `AcceptanceCriteria` (the definition of done) is often empty on a Feature; the child stories carry the acceptance criteria instead. Read the child titles to learn the delivery split (data, API, one UI story per platform), which seeds the "Data and platform" requirements.

Two traps on this estate:

- **Connection resets are transient.** `az boards work-item show` sometimes answers `ConnectionResetError(10054, ...)`. The read is idempotent, so retry the one id that failed.
- **The Windows console drops non-ASCII.** `cp1252` discards em-dashes and shields in a title or description, so a piped read shows gaps or mojibake. When the description matters verbatim, redirect it to a file and read the file.

## Read the companions

Read `backend-details.md` and `frontend-details.md` in the feature folder if they exist. They carry detail the Feature summarizes: the full catalog with thresholds, the view and its flow, the empty and error states, the visibility matrix. You lift the **functional** content from them and leave the technical content where it is.

## Reconcile

The Feature is newer than the detail docs as often as not, and it decides items the docs still hedge. Where they conflict, the Feature wins, and you say so in chat rather than silently picking one.

- A doc marked "open with UX" or "design-dependent" that the Feature has since **decided** is decided: take the Feature's answer.
- A list that grew (a catalog level added, a tier changed): take the Feature's list.
- Flag every conflict you resolve, so the human can push the correction back into the detail doc.

## Distill to the functional

Write only what the user experiences. Route each fact to the right home:

| Belongs in `requirements.md` (functional) | Belongs in the detail docs (technical) |
| --- | --- |
| What the user sees, does, and cannot do | Endpoint routes, verbs, response shapes, status codes |
| The catalog, tiers, thresholds, and rules that define an outcome | Controllers, stores, tables, dbt models, data structures |
| Status meanings and when they change | How a status is computed or persisted |
| Who may view, who may act, and on what | The token claim or server check that enforces it |
| Platform reach (which surfaces show it) | The client base URL, CDN prefix, asset paths |

## The shape

Four sections, in this order. Match the register of an existing feature spec: short declarative sentences, active voice, one instruction per line, American spelling, no em-dashes.

- **Capability** one sentence naming what the user can now do.
- **User Outcome** the before and the after. What lives nowhere today, and what the user reaches after this Feature ships.
- **Definition of Success** the feature-level bar as a checklist. Each line is observable and true or false, not a task.
- **Requirements** the functional requirements, grouped under bold labels by concern (for example: the catalog, calculation and status, viewing, sharing, data and platform). Each group is a flat list of single-behavior lines.

Lead the file with a one-line pointer to the ADO Feature id and to the two companion docs, so the spec traces back to its source and forward to its design.

## Write

Write to `.scratch/features/<feature-slug>/requirements.md`. Slugify the Feature title ("Athlete Achievements" becomes `achievements` or `athlete-achievements`, matching the existing folder). Present the draft in chat for review before you treat it as final.

## Done when

- `requirements.md` holds the four sections, and the Requirements section is grouped by concern.
- Every line is functional. No endpoint, store, controller, or asset path leaked in from the detail docs.
- Every decided item matches the Feature, and every conflict you resolved against a detail doc is flagged in chat.
- The file points back to the Feature id and out to the two companion docs.
