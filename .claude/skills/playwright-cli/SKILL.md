---
name: playwright-cli
description: Automate browser interactions, test web pages and work with Playwright tests.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Browser Automation with playwright-cli

## The loop

Drive the browser by snapshot, not by guessing. Each command returns a fresh snapshot of the page. Read element refs from it, act on a ref, read the next snapshot.

```bash
playwright-cli open https://example.com   # start (in-memory profile)
playwright-cli snapshot                    # elements with refs: e3, e5, ...
playwright-cli click e5                     # act on a ref
playwright-cli fill e2 "user@example.com"  # every action returns a fresh snapshot
playwright-cli close
```

The snapshot is the source of truth for the page. Prefer it over screenshots. Every action prints a `### Snapshot` pointer; take one on demand with `snapshot`.

## Core commands

The verbs used every run:

```bash
playwright-cli open [url]           # open a browser, optionally navigate
playwright-cli goto <url>
playwright-cli snapshot             # elements + refs (options: references/commands/capture.md)
playwright-cli find "text"          # search a big snapshot instead of dumping it
playwright-cli click <ref>
playwright-cli fill <ref> "text"    # add --submit to press Enter after
playwright-cli type "text"          # type into the focused element
playwright-cli press <key>          # Enter, ArrowDown, ...
playwright-cli select <ref> "value"
playwright-cli check <ref>          # and uncheck <ref>
playwright-cli eval "document.title"
playwright-cli go-back              # also go-forward, reload
playwright-cli resize 1920 1080     # set the viewport
playwright-cli close
```

## Targeting elements

Default to refs from the snapshot. CSS selectors and Playwright locators also work.

```bash
playwright-cli click e15                                        # ref (default)
playwright-cli click "#main > button.submit"                    # css selector
playwright-cli click "getByRole('button', { name: 'Submit' })"  # role locator
playwright-cli click "getByTestId('submit-button')"             # test id
```

## Raw and JSON output

`--raw` strips page status, generated code, and the snapshot, returning only the value. Use it to pipe into other tools. `--json` wraps every reply as JSON.

```bash
playwright-cli --raw eval "document.title"
playwright-cli --raw cookie-get session_id
playwright-cli list --json
```

## Windows: URLs with `&`

`cmd.exe` and PowerShell treat `&` as a command separator, so multi-parameter URLs truncate before playwright-cli runs. Escape `&` with `^&` in `cmd.exe`, or prefix the command with `--%` in PowerShell.

```powershell
playwright-cli --% goto "https://example.com/?a=1&b=2"
```

## Command reference

Full command groups, loaded on demand:

* **Input** (keyboard, mouse, drag, drop) [references/commands/input.md](references/commands/input.md)
* **Capture** (snapshot options, screenshot, pdf) [references/commands/capture.md](references/commands/capture.md)
* **Tabs and sessions** (tabs, named sessions, launch, attach, install) [references/commands/tabs-sessions.md](references/commands/tabs-sessions.md)
* **Storage** (cookies, localStorage, sessionStorage, state save/load) [references/commands/storage.md](references/commands/storage.md)
* **Network** (route, unroute, mocking) [references/commands/network.md](references/commands/network.md)
* **Diagnostics** (console, run-code, tracing, video, inspect) [references/commands/diagnostics.md](references/commands/diagnostics.md)

## Tasks

Multi-step workflows:

* **Running and debugging Playwright tests** [references/playwright-tests.md](references/playwright-tests.md)
* **Test generation (plan / generate / heal)** [references/test-generation.md](references/test-generation.md)
* **Running Playwright code (cookbook)** [references/running-code.md](references/running-code.md)
* **Tracing** [references/tracing.md](references/tracing.md)
* **Video recording** [references/video-recording.md](references/video-recording.md)
