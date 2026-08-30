# Tabs and sessions

## Tabs

```bash
playwright-cli tab-list
playwright-cli tab-new [url]
playwright-cli tab-close [index]     # current tab, or the one at index
playwright-cli tab-select <index>
```

## Named sessions

Run parallel browsers with `-s=<name>`. Each session is fully independent: its own cookies, localStorage, sessionStorage, IndexedDB, cache, history, and open tabs.

```bash
playwright-cli -s=mysession open example.com --persistent
playwright-cli -s=mysession click e6
playwright-cli -s=mysession close           # stop one named browser
playwright-cli -s=mysession delete-data     # delete a persistent session's data
playwright-cli list
playwright-cli close-all                      # close every browser
playwright-cli kill-all                       # force-kill stale or zombie daemon processes
```

Set `PLAYWRIGHT_CLI_SESSION` to use a session without `-s` on every call:

```bash
export PLAYWRIGHT_CLI_SESSION="mysession"
```

Name sessions for what they hold (`admin`, `customer-a`), not `test1`. Clean up when done; fall back to `kill-all` for a zombie, and `delete-data` to clear stale persistent data.

## Launch parameters

```bash
playwright-cli open --browser=chrome        # firefox | webkit | msedge
playwright-cli open --mobile                 # generic mobile device: lighter page, smaller and cheaper snapshots. Prefer when a mobile layout is acceptable.
playwright-cli open --device="iPhone 15"
playwright-cli open --persistent             # persist the profile to disk (default is in-memory)
playwright-cli open --profile=/path/to/dir   # persistent with a set directory
playwright-cli open --config=my-config.json
```

The profile is in memory by default. Only `--persistent` (or `--profile`) writes it to disk.

## Attach to an existing browser

Two forms:

```bash
# 1. By channel or CDP endpoint (control a real Chrome/Edge)
playwright-cli attach --extension=chrome            # via the Playwright Extension
playwright-cli attach --cdp=chrome                  # by channel name (chrome | msedge, plus -beta/-dev/-canary)
playwright-cli attach --cdp=http://localhost:9222   # by CDP endpoint

# 2. By session name (e.g. attach to a paused Playwright test run)
playwright-cli attach tw-abcdef
```

Prerequisite for CDP/channel attach: the target browser needs remote debugging on. In it, open `chrome://inspect/#remote-debugging` and check "Allow remote debugging for this browser instance".

Session naming: without `--session`, an attach is named after the channel (`--cdp=msedge` makes a session called `msedge`), so parallel Chrome and Edge attaches do not collide on `default`. Pass `--session=<name>` to override.

```bash
playwright-cli -s=msedge detach   # leave the external browser running
playwright-cli delete-data         # delete the default session's data
```

`detach` works only on sessions made with `attach`. For a session made with `open`, use `close`.

## Install

If a global `playwright-cli` is missing, try the local version:

```bash
npx --no-install playwright --version   # if this works, use "npx playwright cli" in every command
npm install -g @playwright/cli@latest   # otherwise install the global command
```
