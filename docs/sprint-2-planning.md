# Sprint 2 Planning Notes

Sprint 2 module: Customers and Products
Written on: November 22, 2026, after the sprint, from our Planned Tasks sheet and the GitHub board.
Final presentation: December 7, 2026

## Goal
The Customers and Products screens work: list and search, add and edit, delete and restore, and the price history. Every action follows the user's rights, and the server refuses it if the user has no right.

## Who did what
| Person | Tasks | What they cover |
|---|---|---|
| Paolo | S2-DEV-01 to 08 | Customer and product screens, price history, rights checks |
| Geliz | S2-DBA-01 to 06 | Views, current price query, validation, delete rules, demo data |
| Marie | S2-UIX-01 to 05 | Wireframes, mockups, empty and error states, usability review |
| Cheska | S2-TST-01 to 06 | Test cases, soft delete tests, rights tests, regression, bug reports |
| Kim | S2-SM-01 to 05 | Planning, retro follow-up, mid-sprint check, velocity, review |

30 tasks in total, all on the GitHub board with a checklist and an assignee.

## Order we planned
1. Marie's wireframes (S2-UIX-01, 02) and Geliz's views, price query and validation (S2-DBA-01 to 03), because Paolo's screens need them.
2. Paolo builds the lists, forms, delete and restore, and the price history (S2-DEV-01 to 07).
3. Cheska runs the test cases and the rights tests, and Paolo finishes the rights checks (S2-DEV-08).
4. Marie's usability review, Geliz's performance check, and the sprint review.

## Risks we saw
- Paolo had the most tasks, so we watched his load.
- We only had until December 7, so reviews had to be quick but still real.
- The payment terms and units in the Student Guide are different from Sir's SQL file. We follow Sir's SQL: payment terms COD, 30D, 45D and units pc, ea, mtr, pkg, ltr.

## How we tracked progress
The merged PRs in our Planned Tasks sheet and the GitHub board.
