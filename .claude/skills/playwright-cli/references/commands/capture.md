# Capture commands

Snapshots, screenshots, and PDF. The snapshot reads the page; screenshots are rarely needed because the snapshot carries more.

## Snapshot options

```bash
playwright-cli snapshot                        # whole page, timestamped file
playwright-cli snapshot --filename=after.yaml   # name it when the snapshot is a workflow result
playwright-cli snapshot "#main"                 # an element subtree by selector
playwright-cli snapshot e34                      # a ref subtree
playwright-cli snapshot --depth=4                # cap depth on a big page, then drill in
playwright-cli snapshot --boxes                  # include [box=x,y,width,height] per element
```

Search a large snapshot instead of capturing the whole thing (like `grep -C`, 3 lines of context):

```bash
playwright-cli find "Add to cart"
playwright-cli find --regex "\\$[0-9]+\\.[0-9]{2}"
playwright-cli find --regex "/sign (in|up)/i"   # wrap in slashes to add flags
```

## Screenshot and PDF

```bash
playwright-cli screenshot [ref]                 # whole page, or one element
playwright-cli screenshot --filename=page.png
playwright-cli screenshot --hires
playwright-cli pdf --filename=page.pdf
```
