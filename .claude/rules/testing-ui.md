---
paths:
  - "src/apps/web/*/src/**/*.{test,spec}.{js,jsx,ts,tsx}"
  - "src/libs/ui-web/**/*.{test,spec}.{js,jsx}"
---

# UI tests

Vitest and Testing Library over jsdom. Closer a test sits to how a person uses the screen, more it is worth.

- **Query by role or label. `getByTestId` last resort.** Nobody sees a test id.
- **Assert rendered output. Never state, props, or a CSS class.**
- **Stub the helper in `ui-web/utils/HttpHelper`, never `fetch`.** `ui-web` owns every API call these apps make.
- **Failure is a rendered `message`, not a throw.** Operations catch and set state. No error boundary exists.
- **Test a `<Domain>Data.js` operation without React.** Operations take `(args, state, setState)`, so pass a fake `setState` and assert what it got.
- **`userEvent`, not `fireEvent`.** `fireEvent` sends one event; a real key press sends several.
- **`findBy*` to wait, `queryBy*` only to prove absence.** `waitFor` around a bare `getBy*` hides the DOM on failure. One assertion inside, no side effects.
- **Query through `screen`.** No destructuring into `wrapper`. `enzyme` sits in `devDependencies` and is not the pattern.
- **No layout or geometry assertions.** jsdom runs no layout, so every box measures zero.
- **Check the app's React tag before a hook.** Apps carry `react:17` or `react:19`.
- **No business rule.** Eligibility, pricing, and authorization belong to the API. Assert the UI asked, and what it rendered.
