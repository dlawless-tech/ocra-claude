---
paths:
  - "src/**/*Tests.cs"
  - "src/**/*.Tests/**/*.cs"
  - "src/tools/*/*.test.js"
  - "src/apps/web/*/src/**/*.{test,spec}.{js,jsx,ts,tsx}"
  - "src/libs/ui-web/**/*.{test,spec}.{js,jsx}"
---

# Testing

All stacks.

## A test that cannot fail is a defect

Delete it, write a real one. Never patch it. Stays green after you break the feature when it:

- asserts nothing, or only presence or shape: `Assert.NotNull`, `toBeDefined`, `Array.isArray`
- takes its expected value from the code under test, or from its own stub
- regenerates a failed snapshot instead of reading the diff

Prove a new test fails: break the line it covers, watch red, restore.

## A good test

- **Exact values.** `Assert.Equal(expected, actual)`, `.toEqual(expected)`. Expected written by hand.
- **Output, not calls.** A call-count assertion passes on a wrong answer.
- **Public surface only.** A test bound to internals breaks on a rename and survives a real break.
- **One reason to fail,** and the name says which.
- **Straight through.** No `if`, loop, or `try`. A test needing its own test is wrong.
- **Repeats.** No clock, timezone, random, sleep, run order, shared row, or file it did not write.
- **Reads without running.** Duplication beats a helper that hides the setup or the assertion.
- **Stubs the process boundary, nothing closer.** A stub of your own code proves the stub.
- **Named for what it tests.** `Button.test.jsx` beside `Button.jsx`. `RosterControllerTests.cs` mirrors `RosterController.cs`.

## Every behavior gets a test

A new endpoint, query parameter, filter, or branch is untested until an assertion fails without it. Refusals count: rejected auth, invalid input, and the body each returns.
