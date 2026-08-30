# Diagnostics commands

Read console and network logs, inspect element internals, run page code, and capture traces or video.

## Console and network log

```bash
playwright-cli console            # all messages
playwright-cli console warning     # filter by level
playwright-cli requests            # list network requests
playwright-cli request 5           # detail for request #5
```

## Inspect element attributes

When the snapshot does not show an element's `id`, `class`, `data-*`, or computed style, read it with `eval` on a snapshot ref:

```bash
playwright-cli eval "el => el.id" e7
playwright-cli eval "el => el.className" e7
playwright-cli eval "el => el.getAttribute('data-testid')" e7
playwright-cli eval "el => el.getAttribute('aria-label')" e7
playwright-cli eval "el => getComputedStyle(el).display" e7
```

## Run page code

```bash
playwright-cli run-code "async page => await page.context().grantPermissions(['geolocation'])"
playwright-cli run-code --filename=script.js
```

`run-code` runs one function expression against the page. See [../running-code.md](../running-code.md) for the contract and a cookbook (geolocation, permissions, media emulation, waits, frames, downloads, clipboard).

## Locators and highlights

```bash
playwright-cli generate-locator e5 --raw                   # a Playwright locator for a ref or selector
playwright-cli highlight e5                                 # persistent overlay
playwright-cli highlight e5 --style="outline: 3px dashed red"
playwright-cli highlight e5 --hide                         # hide one; "highlight --hide" hides all
```

## Interactive review

Ask the user for UI review or design feedback. The user draws boxes on the live page and types comments; you receive the annotated screenshot, the marked region's snapshot, and the notes. Use it whenever the user asks for "UI review", "design feedback", or to "ask the user what they think or want".

```bash
playwright-cli show --annotate
```

## Tracing and video

```bash
playwright-cli tracing-start ; playwright-cli tracing-stop
playwright-cli video-start out.webm
playwright-cli video-chapter "Title" --description="..." --duration=2000
playwright-cli video-show-actions --duration=600 --position=top-right   # annotate each action in the video
playwright-cli video-hide-actions
playwright-cli video-stop
```

For when to trace versus record, and the hero-video workflow, see [../tracing.md](../tracing.md) and [../video-recording.md](../video-recording.md).
