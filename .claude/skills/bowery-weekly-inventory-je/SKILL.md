---
name: bowery-weekly-inventory-je
description: Post the weekly beverage inventory journal entries into Bowery Group Restaurant365, one per store, booking each GL's change in the Craftable Inventory by GL count between 190 inventory and 510 purchases, with the Craftable export attached. Use when asked to fill, balance, or approve the Bowery Inventory entries in R365, to pull the Craftable Inventory by GL report, or to correct past Inventory entries against Craftable or the balance sheet.
---

# Weekly inventory counts into the Bowery journal entries

Each store counts its beverage inventory every Sunday in Craftable. The week's entry moves each GL's change in count value between the balance sheet and purchases, so that 190 inventory on the books equals the Sunday count:

| Craftable GL                       | Inventory GL                     |
|------------------------------------|----------------------------------|
| 510-01 - Purchases-Beverage Liquor | 190-02 - Inventory-Liquor        |
| 510-02 - Purchases-Beverage Wine   | 190-03 - Inventory-Wine          |
| 510-03 - Purchases-Beverage Beer   | 190-04 - Inventory-Beer          |
| 510-04 - Purchases-Beverage N/A    | 190-05 - Inventory-N/A Beverage  |

A count that rose debits the 190 line and credits its 510 line; a count that fell does the reverse. Each store's entry holds exactly these eight lines at the store's location, with blank comments.

Five stores post; Bowery Group Corp has no inventory. Craftable store ids, R365 locations and legal entities live in [`scripts/stores.json`](scripts/stores.json).

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365 beyond these scripts. Work in one directory for the whole run, since `playwright-cli` binds sessions to it, and keep R365 in tab 0:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh inv
bash <skill>/scripts/craftable-login.sh inv
```

Both logins come from `~/.claude/bowery-credentials.md`; the Craftable one sits under its `## Craftable` heading.

## The week

The week runs Monday through Sunday and the entry is dated the Sunday, the audit date. The week ending 9/27/2026 reads Craftable's Audit Date range 9/21 to 9/27 and changes from the 9/20 counts.

## Step 1: find the prior week's entries

```bash
bash <skill>/scripts/entries.sh inv
```

It lists every Journal Entry numbered exactly `Inventory` as `date ; location ; status ; amount ; id`. Each store needs an Approved entry dated the prior Sunday; its id is the one Step 3 duplicates. A store that already has an entry dated the week ending is done for the week; report it and leave it.

## Step 2: pull the counts

```bash
bash <skill>/scripts/pull-audits.sh inv 2026-09-27
node <skill>/scripts/build-lines.js audits.json > lines.json
```

`pull-audits.sh` reads each store's Inventory by GL for the week and the week before through Craftable's own report endpoint, the one behind **Books > Reports > Inventory by GL**, and saves the week's **Export** as `att/<store>/09.27.26.xlsx`, the name the entry's attachment carries. `build-lines.js` prints each store's four changes and entry total, and writes `lines.json`.

Each count rounds to the cent before subtracting; that reproduces every September 2026 entry to the penny.

`build-lines.js` prints `STOP:` and writes nothing when a store's week holds anything but one audit on the expected Sunday, lacks one of the four GLs, or carries a GL outside them. Craftable files uncategorized items under `Unassigned`: the 8/30/2026 counts had Unassigned lines at Rosie's and Vic's, and past entries folded them into beer with a line comment. Report an Unassigned amount to the human and ask where it goes before posting that store.

Before posting, read each change against the store's usual weekly swing of a few hundred dollars per GL. A change in the thousands, such as Shuka's liquor rising 2,760.08 in the week ending 9/27/2026, is worth naming to the human.

## Step 3: post each store

```bash
bash <skill>/scripts/post-store.sh inv Cookshop <prior week's id>
```

It duplicates the prior entry (transaction only), dates the copy the week ending with number `Inventory`, sets the eight lines from `lines.json`, saves, attaches the export, saves again, and reloads the server copy. It prints the new id and ends on `check-entry.js`, which prints `MATCH` only when the number, date, eight lines, location, balance at the store's total, and attachment all hold. The entry stays Unapproved.

Store keys are `Cookshop`, `Shuka`, `Rosies`, `Shukette`, `Vics`.

## Step 4: approve

Approve once the human has reviewed the week, or when told to approve outright:

```bash
bash <skill>/scripts/approve.sh inv <id>
```

It confirms `Successfully Approved` in the server's reply. The week is done when `entries.sh` shows all five stores dated the week ending, Approved at their `lines.json` totals.

Report each store's four changes, entry total, status, and attachment.

## Step 5: close the windows

Once the week is approved and reported, close every browser window from the run's working directory:

```bash
playwright-cli -s=inv close
playwright-cli list    # confirms no session is left open
```

This ends the run, and a correction afterward logs in to both sites again. Close after a correction the same way.

## Correcting a past entry

A past week whose counts changed in Craftable, or that started from the wrong balances, is corrected in place. Build that week's `lines.json` with `pull-audits.sh` for its Sunday, then:

```bash
bash <skill>/scripts/fix-entry.sh inv <store> <id> att/<store>/<MM.DD.YY>.xlsx ["<wrong attachment name>"]
```

It unapproves, sets the lines, saves, deletes the named wrong attachment if given, attaches the fresh export beside the old ones, approves and closes, and checks the server copy to `MATCH`. It approves last because an upload onto an approved entry has come back Unapproved.

A change in one week's count moves two entries: that week's and the next. Correct both, or the next week's change double counts. Weeks after that are unaffected.

When the books' starting balances differ from Craftable's first counts, the first week starts from the balance sheet instead; [`BALANCE-SHEET.md`](BALANCE-SHEET.md) covers that rebuild.

## R365 quirks

- A `goto` to the entry url already open keeps the stale page, showing the old ribbon and attachments. The scripts bounce off `/react/home` first; do the same by hand.
- `duplicate.sh` acts in the current tab. Keep R365 in tab 0 and select it first, or the copy replaces the Craftable tab.
