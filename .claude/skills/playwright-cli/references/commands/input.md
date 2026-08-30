# Input commands

Keyboard, mouse, and drag/drop primitives. For the everyday `click` / `fill` / `type` / `press`, use the core commands in `SKILL.md`.

## Clicks and hover

```bash
playwright-cli dblclick e7
playwright-cli hover e4
```

## Keyboard

```bash
playwright-cli press Enter        # also ArrowDown, Tab, Escape, ...
playwright-cli keydown Shift       # hold a key
playwright-cli keyup Shift         # release it
```

## Mouse

Coordinate-level control, when a ref action will not do.

```bash
playwright-cli mousemove 150 300
playwright-cli mousedown            # add "right" for the right button
playwright-cli mouseup
playwright-cli mousewheel 0 100
```

## Drag and drop

```bash
playwright-cli drag e2 e8                          # element to element
playwright-cli drop e4 --path=./image.png          # drop a file from outside the page
playwright-cli drop e4 --data="text/plain=hello world"
```

## Files and dialogs

```bash
playwright-cli upload ./document.pdf         # set files on a file input
playwright-cli dialog-accept                  # accept an alert / confirm / prompt
playwright-cli dialog-accept "prompt text"    # accept a prompt with text
playwright-cli dialog-dismiss                 # dismiss it
```
