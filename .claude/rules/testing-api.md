---
paths:
  - "src/**/*Tests.cs"
  - "src/**/*.Tests/**/*.cs"
---

# API tests

xunit.

- **Never `Assert.True(x == expected)`.** A failed boolean assert reports only `false`; `Assert.Equal` prints both. Expected goes first.
- **`[Theory]` plus `[InlineData]` for a set, `[Fact]` for one.** The fix for a loop or an `if` in a test. Each row reports separately.
- **Stub at the repository in `swims-data-access`.** EF Core, Dapper on stored procedures, and ad-hoc context all coexist, so stub whichever the file uses. Reaching a store directly skips row-level security and proves nothing about authorization.
- **Pin a fixed test identity.** Ids encrypt per caller and `ClaimTypes.Sid` carries `PersonId`. No known caller, no meaning.
- **Assert the error body.** No exception middleware normalizes it, so its shape drifts silently.
- **Helper method, not a shared field or fixture.** xunit builds a new class instance per test. `IClassFixture` only for costly setup, and then treat it as shared mutable state.
- **Drive a private method through its public caller.**
