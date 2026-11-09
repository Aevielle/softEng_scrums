# Sprint 1 Mid-Sprint Check Notes and Impediment Log

Checked on: November 6, 2026
Sprint goal: Login and Sign Up module (landing page, register, sign in, forgot password) for our November 9 presentation.

## Where we are
From our Planned Tasks sheet, 14 of 30 Sprint 1 tasks are merged. (Update these numbers if they changed.)

| Person | Merged | Still to do |
|---|---|---|
| Paolo | 4 of 8 (Scaffold, Register, Login, Reset password) | User Management, approval, Rights dialog, main page |
| Geliz | 5 of 6 (database, tables, seed data) | Audit log (S1-DBA-06) |
| Marie | 3 of 5 (design system, wireframes, mockups) | Main page and User Management wireframes, usability review |
| Cheska | [update] of 6 (test plan merged in #38) | Test cases, bug reports, smoke test |
| Kim | 1 of 5 (PR template, #28) | Working agreement, module plan, mid-sprint notes, sprint review |

## What's done
- Register, Login, and Reset password are built and merged.
- The Supabase database and the user tables are in.
- The design system and mockups are done.

## What's late or at risk
- Testing: the test cases for register, login, and reset password still need to be run before November 9.
- Landing page: [Paolo to confirm status].
- Our sheet is missing PR links for some merged tasks.

## Impediment log
| # | What happened | Who was affected | What we did | Status |
|---|---|---|---|---|
| 1 | Register failed with "The default User role is not configured" | Paolo | The default roles were added to the database by Geliz | Solved (Register merged in #48) |
| 2 | Two Issues told two people to make .env.example and .gitignore, so their pull requests conflicted | Geliz, Paolo | Geliz merged main into her branch and fixed the conflict. We made each Issue's job clearer | Solved |
| 3 | A pull request was merged before anyone reviewed it | Team | New rule: no review, no merge | Solved (rule in our working agreement) |
| 4 | Many old and leftover branches | Team | We deleted the old ones and turned on auto-delete after merge | Solved |
| 5 | Waiting for an answer: do new accounts sign in right away or need approval? | Paolo | Asking our teacher | [Open / Solved] |
| 6 | Waiting for an answer: do we use Supabase Auth or our own user table? | Paolo, Geliz | Asking Paolo and Geliz | [Open / Solved] |

## What we'll do next
- Cheska runs the register, login, and reset password test cases.
- Paolo finishes the landing page and the main page.
- Everyone pastes their PR links into the sheet.
- We do a quick run-through of the demo before November 9.
