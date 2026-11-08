# Team Working Agreement

Group 4, Hope, Inc. ERP.

## Our roles
| Role | Name | What they do |
|---|---|---|
| Scrum Master | Kim Aeriel V. Fonseca | Organizes the board, follows up on blockers, merges pull requests, writes the sprint notes |
| UI/UX | Rilaneh Marie L. Acabal | Design system, wireframes, mockups, notes for the developer, usability review |
| Backend Developer | Earl Paolo M. Octoman | Builds the screens and the code (Next.js, React, Node.js) and connects them to the database |
| DevSecOps / DB Admin | Isabel Geliz V. Ramos | Supabase tables, migration script, seed data, audit log |
| Test Engineer | Franchesca E. Ramirez | Test plan, test cases, bug reports, checks that fixes work |

## How we work
1. Pick your Issue on the board and move it to In Progress.
2. Make a new branch for each Issue, from the latest main: `git checkout main`, `git pull`, then `git checkout -b s1-dev-02-register` (use your own task ID). One Issue = one branch = one pull request. Don't 
5. The tester tests it and one teammate reviews it. No review, no merge.
6. The Scrum Master merges it. Nobody pushes straight to main, it's protected.
7. Update our Planned Tasks sheet: Status and PR link.

## Definition of Done
- The work is on its own branch from the latest main, with a pull request linked to the Issue
- At least one teammate reviewed the pull request
- Every acceptance criterion in the Issue is checked
- The pull request is merged into main and the sheet is updated

## Blockers
If you can't continue, add the Blocked label to your Issue and write a comment about what you need and who can help. The Scrum Master replies the same day. When it's solved, remove the label and comment "unblocked".

## Team rules
- Real passwords, keys, and the real .env never go to GitHub. Only .env.example.
- README: Paolo edits the steps for running the app. Geliz writes the database steps in Database Setup Instructions.md. Tell Kim before changing anything else.
- Keep each pull request about one Issue.
- Ask for help early, don't wait until the deadline.
