# Bowery Grubhub, week of 9/15/2026

- **Period:** Tue 9/15 through Mon 9/21/2026 (run Thursday 9/24, New York time)
- **Entry date:** 9/20/2026
- **GL window:** 9/15 through 9/21/2026

Grubhub created all four deposits on Wed 9/23, with an effective date of Fri 9/25, which matches the pattern of prior weeks. For each deposit, gross plus every signed total equals the net to the penny. The GL report shows each store's beginning balance cleared by the 9/18 bank deposit, and every one matches Grubhub's prior deposit exactly, so no earlier deposit is outstanding. After each credit, the A/R balance for the location equals its net deposit.

All four 9/20 entries were Unapproved at 0.00 before the run, so none were skipped.

## Figures

| Store | D (GL debits) | Grubhub gross | Net deposit | Commissions | Delivery commissions | Processing fees | A/R credit | Difference |
|---|---|---|---|---|---|---|---|---|
| Cookshop | 2,327.82 | 2,313.97 | 1,986.78 | 106.00 | 188.80 | 83.56 | 341.04 | 37.32 credit |
| Rosie's | 929.61 | 929.73 | 702.65 | 125.78 | 67.85 | 33.45 | 226.96 | 0.12 credit |
| Shuka | 5,437.55 | 5,313.17 | 4,581.66 | 245.55 | 304.00 | 181.96 | 855.89 | 124.38 debit |
| Vic's | 387.59 | 387.61 | 284.69 | 53.40 | 35.60 | 13.92 | 102.90 | 0.02 credit |

## Differences

- **Cookshop, 37.32 credit.** Three causes. First, a 51.17 account adjustment: a `CS_CREDIT` on order 532634661533702, which reimburses the refund of that order in the prior period. It raises the net deposit with no sale behind it. Second, a 14.00 refund on order 880034728042730 (9/16) that R365 still books as a sale. Third, R365 runs 0.15 under Grubhub from one to three cents a day. Total: -51.17 + 14.00 - 0.15 = -37.32.
- **Rosie's, 0.12 credit.** Daily rounding: R365 runs zero to four cents under Grubhub each day.
- **Shuka, 124.38 debit.** Day-level mismatches between R365 daily sales and Grubhub orders net of refunds. R365 overbooks 9/18 by 209.02, and that includes a 29.40 partial refund on order 599134749361045 that R365 still carries. R365 underbooks 9/15 by 75.11, 9/16 by 6.97, and 9/19 by 2.52, and the remaining days differ by a few cents. No single order matches the 9/15 and 9/18 gaps, which points to a daily sales entry on those days. Worth a look at the 9/15 and 9/18 Shuka sales journals.
- **Vic's, 0.02 credit.** Daily rounding.

## Result

| Store | Deposit ID | Net deposit | Fees | Difference | Status |
|---|---|---|---|---|---|
| Cookshop | 26092523bgfiIl4 | 1,986.78 | 378.36 | 37.32 credit | posted |
| Rosie's | 26092523eOnrAHE | 702.65 | 227.08 | 0.12 credit | posted |
| Shuka | 26092523jo_F6pj | 4,581.66 | 731.51 | 124.38 debit | posted |
| Vic's | 26092523UWCSZNz | 284.69 | 102.92 | 0.02 credit | posted |
