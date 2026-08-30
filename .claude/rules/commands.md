---
paths:
  - "src/**"
---

# Commands

Setup is `scripts/setup-dev-env.sh`; `--check` verifies without writing.
Install is `yarn install`. Yarn 4.17.1 is pinned by `yarnPath`, so a global yarn only ever bootstraps.
A bare `dotnet` must resolve to the pinned SDK under `~/.dotnet`. `scripts/setup-dotnet-sdk.sh --check` confirms it.

| Task | Command |
|---|---|
| List projects, or one project's targets | `nx show projects`, `nx show project <name>` |
| Build .NET, 12 of 12 green | `nx run-many -t build --projects=tag:platform:dotnet` |
| Build what a change touches | `nx affected -t build --files=<path>` |
| Run one .NET API locally | `nx run <api>:dev`. Ports 5010 to 5019, one per API; Swagger UI at `/` |
| Lint a web app | `nx run <app>:lint` |
| Test | `nx run-many -t test --all`. Only the three tools under `src/tools/`, `data-hub-ui`, and `person-api.Tests` have the target; `nx show project <name>` says whether one does |
| Regenerate the table reference after a schema change | `nx run schema-index:build` |

Set `FONTAWESOME_NPM_AUTH_TOKEN` before any JS target; all of them fail without it.
