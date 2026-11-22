# Team Working Agreement

Group 4, Hope, Inc. ERP. We wrote this so we all work the same way.

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
2. Make a new branch for each Issue, from the latest main: git checkout main, git pull, then git checkout -b s1-dev-02-register (use your own task ID). One Issue = one branch = one pull request. Don't reuse your old branch.
3. Open a pull request when you're done and fill in the template. Write "Closes #(Issue number)" if it finishes the task. If not, write "Related to #(Issue number)".
4. The tester tests it and one teammate reviews it. No review, no merge.
5. The Scrum Master merges it. Nobody pushes straight to main, it's protected. The branch deletes itself after the merge.
6. Closing an Issue is not enough. A task counts only when its pull request is merged, and the PR link is in our Planned Tasks sheet.

## Definition of Done
- The work is on its own branch from the latest main, with a pull request linked to the Issue
- At least one teammate reviewed the pull request
- Every acceptance criterion in the Issue is checked
- The pull request is merged into main and the sheet is updated

## Blockers
If you can't continue, add the Blocked label to your Issue and write a comment about what you need and who can help. The Scrum Master replies the same day. When it's solved, remove the label and comment "unblocked".

## Daily check-in
We check in once a day in our group chat. Everyone answers 3 things: what I finished, what I'm doing next (Issue number), and if I have a blocker.

## Team rules
- Real passwords, keys, and the real .env never go to GitHub. Only the .env.example files.
- Paolo edits the steps for running the app in the README. Geliz writes the database steps in Database Setup Instructions.md. Tell Kim before changing anything else in the README.
- Keep each pull request about one Issue.
- Ask for help early, don't wait until the deadline.
