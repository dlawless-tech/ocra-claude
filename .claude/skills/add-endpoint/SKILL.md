---
name: add-endpoint
description: Add an endpoint to one of the ten .NET APIs, wiring the full vertical slice through controller, service, and repository.
disable-model-invocation: true
---

# Add endpoint

Add one endpoint to one of the ten APIs under `src/apps/dotnet/`, wiring every layer it touches.

| Read | For |
| --- | --- |
| `reference/layers.md` | Where each layer lives, its namespace, and the code shape of each including EF vs Dapper |
| `reference/examples.md` | Two worked runs: a new endpoint on an existing controller, and a new endpoint on a new controller |

Read `reference/layers.md` before writing any file.

## Scope

- In scope: controller action, service method, repository method, the two interfaces, DI registration, and a `ViewModel` if the endpoint needs a new return shape.
- Out of scope: the TypeScript client that calls the endpoint, database schema changes, and new EF entity models. If the endpoint needs any of those, stop and say so rather than inventing one.

## 1. Gather the parameters

Parse whatever the user passed as arguments, then ask once, in plain text, for everything still missing. Do not use the AskUserQuestion UI. Do not ask one question at a time.

| Parameter | Values | Notes |
| --- | --- | --- |
| API | one of the ten under `src/apps/dotnet/` | Required. Not inferable |
| Reference controller | path or controller name | Optional but the highest-value input. See step 2 |
| Controller | `new` plus a name, or an existing controller | New controllers are rare. Most work adds an action to an existing one |
| HTTP method | GET, POST, PUT, DELETE | Drives the route template and the return type |
| Controller action name | e.g. `GetPersonNarrativeForPersonId` | |
| Route | e.g. `Person/{personId}` | Ask if not given. Do not guess a route that changes the public API surface |
| Authorize roles | the exact `[Authorize(Roles = "...")]` string, or `none` | Required. See below |
| Encryption handler | `yes` or `no` | Whether the action carries `[UsasEncryptionHandler]`. Changes the parameter types. See below |
| Service | `new` plus a name, or an existing service | |
| Service method name | | Conventionally identical to the controller action name |
| Repository | `new` plus a name, or an existing repository | New repository means a new shared file. See step 4 |
| Repository method name | | Conventionally identical to the service method name |
| Data access | `ef` or `dapper` | Two different code shapes. See `reference/layers.md` |
| Return type | an entity in `SwimsDataAccess.Models` or a view model in `SwimsDataAccess.ViewModels` | |

**Authorize roles.** Never invent this. Role strings are comma-separated inside one string, as in `[Authorize(Roles = "Member Edit - Narratives, Member Read")]`, and a wrong one compiles and ships as a security defect.

- If the user gave the roles, use them verbatim.
- If they did not, propose the roles used by the sibling actions on the same controller and say you are doing so. On a GET, sibling read actions are the right source. On a write, sibling write actions are.
- If the controller is new and there is no reference controller, ask. Do not default to unauthenticated and do not default to the broadest role you find.
- `none` means the action is deliberately anonymous. Write it with no `[Authorize]` attribute and call that out in the report.

**Encryption handler.** `[UsasEncryptionHandler]` goes on the action, never the class. It decrypts inbound identifiers before the action body runs, so it changes the signature you write.

- **Every encrypted identifier parameter is declared `string`, then parsed in the body.** A `personId` arrives as a URL-safe Base64 blob, so binding it to `long` fails before the filter runs, and the filter writes a decrypted `string` back into the argument slot regardless. Declare `string personId`, then `long pId = long.Parse(personId);` as the first line inside the `try`.
- The filter matches on parameter **name**: exactly `id`, or any name containing `Id`. A parameter named `personKey` is never decrypted no matter what it holds. Name identifiers `...Id`.
- A numeric parameter that is not encrypted can stay `int` or `long` even on a decorated action, because the decrypt branch only fires when the value looks Base64. Mirror the sibling rather than converting everything to `string`.
- Decorated actions require a `Usas-Sub-Id` request header. Without it the filter returns 400 before the action runs, so adding the attribute to an endpoint an existing caller already uses is a breaking change.
- Set it to `yes` when the action takes an encrypted identifier, or when the payload uses an `_enc` view model whose secure fields need decrypting. If sibling actions on the same route shape carry it, the new one does too.

**Org-unit filtering** is the same class of decision, but resolve it rather than asking. If sibling repository methods on the same entity call `.Filter(_configuration, currentPersonId, SecuredByOrgUnit.Settings.Area.X)`, the new one does too. Omitting it silently widens data access.

## 2. Mirror a reference slice

The estate has real drift between APIs, so a template is a worse guide than a neighbor. Before writing anything:

- If the user named a reference controller, read its full vertical slice: controller, service, service interface, repository, repository interface.
- If they did not, pick the closest existing slice yourself. Closest means same API, same entity, and same HTTP method where possible. Name the slice you picked in your reply so the user can correct it.

Match what that slice does, including its return types, its exception handling, and its `using` block. Prefer the neighbor's convention over the shape in `reference/layers.md` wherever the two disagree.

## 3. Write the layers

Work outside-in so each layer's signature is fixed before the next one consumes it. Files, namespaces, and code shape per layer are in `reference/layers.md`.

1. Repository interface and implementation, in `src/libs/dotnet/swims-data-access/Repositories/`.
2. Service interface and implementation, in `src/apps/dotnet/<api>/<api>/Services/`.
3. Controller action, in `src/apps/dotnet/<api>/<api>/Controllers/`.

Adding a method to an existing class means editing four files, not creating them. Add the method next to its siblings, matching their order.

## 4. Register in DI

This is the step most likely to go wrong, because the two layers register in different projects.

| New type | Registers in |
| --- | --- |
| Service | `src/apps/dotnet/<api>/<api>/DependencyInjection.cs`, in the live services block at the top |
| Repository | `src/libs/dotnet/swims-common-services/DependencyInjection.cs` |

The per-API `DependencyInjection.cs` also holds a long block of repository registrations that are **entirely commented out**. Do not uncomment them and do not add to them. Repositories resolve from `swims-common-services` for every API.

Only new classes need registration. Adding a method to an existing service or repository needs no DI change. Controllers are never registered.

## 5. Verify

- Build the affected projects: `nx affected -t build --files=<the files you changed>`.
- A new repository method touches `swims-data-access`, which all ten APIs reference, so expect roughly twelve projects to rebuild. If only one project is affected, the repository change did not land where you think it did.
- The .NET SDK lives at `~/.dotnet` and may not be on `PATH`. `scripts/setup-dotnet-sdk.sh` fixes that.
- The build has around 774 pre-existing warnings. Report new warnings, not the baseline.

## 6. Report

State the files created, the files edited, the DI entries added, the reference slice mirrored, and the build result. Call out anything you assumed rather than were told, especially the authorization roles and the org-unit filter decision.
