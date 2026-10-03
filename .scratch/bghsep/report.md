# Bowery Grubhub, September 2026 review

Run Fri 10/2/2026. Read-only: nothing was changed in R365.

Sources: every Grubhub deposit paid 8/28 through 10/3 (`deps.json`), the 16 September GrubHub entries (`entries.txt`), and GL Account Detail on 104-06 for 9/1 through 10/2 by location (`gl.json`).

## The September entries

All 16 entries (9/6, 9/13, 9/20, 9/27, four stores each) are Approved. For every one:

- the three fee lines equal the Grubhub deposit to the penny,
- the a/r credit equals the period's GL debits minus the net deposit,
- every Grubhub deposit cleared through a Bank Deposit at exactly its net.

| Store | 9/6 | 9/13 | 9/20 | 9/27 | Sept difference lines |
|---|---|---|---|---|---|
| Cookshop | 184.16 | 300.13 | 378.36 | 289.38 | 0.09 Cr, 68.52 Dr, 37.32 Cr, 35.80 Dr |
| Rosie's | 133.46 | 133.97 | 227.08 | 291.75 | 0.08 Cr, 0.06 Cr, 0.12 Cr, 0.15 Cr |
| Shuka | 781.61 | 751.65 | 855.89 | 1,252.50 | 0.83 Dr, 15.88 Dr, 124.38 Dr, 97.03 Dr |
| Vic's | 89.95 | 53.83 | 102.92 | 148.01 | 0.02 Cr, 0.00, 0.02 Cr, 0.02 Cr |

## Correction 1: Vic's A/R short 106.70 since 8/31

Vic's 104-06 opened September at 267.37 against an outstanding deposit of 374.07, and dipped to -81.66 after the 9/11 deposit. Every later balance carries the same 106.70 shortfall. 10/2 ending balance 447.56 should be 554.26 (9/22 to 9/28 net 409.45 plus 9/29 to 9/30 sales 144.81).

Cause: the 8/31 entry (two lines, no comments) credits A/R 234.10 / debits 632-02 234.10. Grubhub's fees for that deposit (26090401UWCSZNz) were 127.44, and A/R through 8/30 was 501.47, so the credit leaving A/R at the 374.07 deposit is 127.40. The extra 106.70 is exactly Vic's 9/2 Grubhub sale: the credit was figured from an A/R balance that already held 9/2.

Proposed fix, either:

- edit the 8/31 Vic's entry to 127.40 / 127.40, if August is open, or
- post a 9/30 entry at Vic's: Dr 104-06 A/R - Grub Hub 106.70, Cr 632-02 Delivery Fees 106.70, comment "reverse 8/31 over-credit".

The other three 8/31 entries leave A/R at their deposit exactly.

## Correction 2 (cutoff, your call): 9/29 to 9/30 deposit

Grubhub split the 9/29 to 10/5 period at month end and paid 9/29 to 9/30 as its own deposit (created 10/1, effective 10/2). Those sales sit in September A/R, and the fees would otherwise post on the 10/4 entry in October. A 9/30 entry per store:

| Store | Deposit | D (9/29-9/30) | Net | A/R credit | Commissions | Delivery comm. | Processing | Difference |
|---|---|---|---|---|---|---|---|---|
| Cookshop | 26100201bgfiIl4 | 738.97 | 633.63 | 105.34 | 33.10 | 45.20 | 27.04 | 0.00 |
| Rosie's | 26100201eOnrAHE | 176.71 | 136.47 | 40.24 | 23.55 | 10.40 | 6.29 | 0.00 |
| Shuka | 26100201jo_F6pj | 966.79 | 820.89 | 145.90 | 60.60 | 117.30 | 45.45 | 77.45 Cr |
| Vic's | 26100201UWCSZNz | 144.81 | 106.24 | 38.57 | 19.95 | 13.30 | 5.32 | 0.00 |

Shuka's 77.45 credit: R365 booked 647.80 on 9/29 against Grubhub's 725.24. That deposit also holds two large refunds (424.61 on 998134855896731, 291.79 on 847634852531916) that land on 9/29 by refund time, so the 9/29 sales journal is worth a look before posting.

If posted, the 10/4 entries then cover only the 10/1 onward deposit.

## Not corrected: refund plugs in Delivery Fees

The difference lines follow the skill's method, so they are correct as booked, but most are Grubhub refunds expensed to 632-02 while R365 still carries the original sale:

- Cookshop: 9/10 refunds 51.17 and 17.42 (9/13 entry); 51.17 reimbursed by a CS_CREDIT on 9/16 (9/20 entry); 14.00 on 9/16; 7.62 on 9/22 and 28.31 on 9/28 (9/27 entry). September's difference lines net to 66.91 debit.
- Shuka: 238.12 debit across the month. Refunds on 9/3, 9/4, 9/13, 9/18, 9/21 and 9/25, plus unexplained day gaps on 9/15 (R365 75.11 under) and 9/18 (R365 209.02 over).

If refunds should sit somewhere other than Delivery Fees, that is a reclass of these amounts.

## Posted 10/2/2026

Both corrections posted and approved as 9/30 GrubHub entries, each duplicated from the store's 9/27 entry:

| Store | Entry id | Total | A/R 9/30 |
|---|---|---|---|
| Cookshop | ea0fb905-5dba-4120-aaa1-c28117104e1b | 105.34 | 1,895.11 |
| Rosie's | 219bd7e4-5101-4a21-b836-9034b2a7eed3 | 40.24 | 1,042.08 |
| Shuka | b190ab22-09ca-497b-bf46-3331856a75ac | 223.35 | 6,401.69 |
| Vic's | 823e07c7-2c83-46cf-a74e-9c057de542bc | 145.27 | 515.69 |

Vic's entry carries the two "reverse 8/31 over-credit" lines (Dr 104-06 / Cr 632-02 106.70). Every 9/30 A/R balance equals the 9/30 and 10/2 deposits still to land. The 8/31 entry is unchanged.

## Changes 10/3/2026

- **Vic's 106.70 moved to August.** The 8/31 Vic's entry now reads 127.40 / 127.40 (was 234.10). The two "reverse 8/31 over-credit" lines are gone from the 9/30 Vic's entry, which is back to 38.57. Both re-approved.
- **Shuka 9/29, 77.45.** Grubhub's 9/29 orders net to 725.24 after two full refunds (424.61 "change of plans", 291.79 "incorrect order") and a 13.07 add-on. R365's 9/29 sales summary booked 647.80 to Grubhub. The only small sets of orders worth 77.43 are pickup order O-477834852462208 (45.86, the day's only pickup, with a 3.40 tip) plus one 31.57 order, O-146934855490925 (12:01 pm) or O-015434859294551 (6:07 pm). The R365 summary shows no per-order detail and there is no POS access here, so confirm in Toast which tickets were tendered as something other than Grubhub.
- **Backup.** Each of the 24 GrubHub entries from 8/31 through 9/30 carries `GrubHub <store> <MM.DD> backup.pdf`: tie-out page plus the Grubhub deposit page. All 24 tie-outs tie.
