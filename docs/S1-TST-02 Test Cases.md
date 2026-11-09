# Test Cases for Sprint 1

## Test Setup
### Tester
Franchesca E. Ramirez
### Testing Start Time
After Paolo's S1-DEV-02, S1-DEV-03, and S1-DEV-04 are merged.
### Test Setup
Automated tests using Jest (API and route level, run with `npm test`).
- **Mocked tests:** `supabaseAdmin` is mocked, so no database rows are written.
- **Integration tests:** run against the test database (`.env.test`) with seeded accounts or throwaway rows that are cleaned up.

## Sprint 1 Results Summary
**Run date:** 2026-11-07 | **Suites:** 12 (10 passed, 2 failed) | **Tests:** 83 (80 passed, 3 failed)

All 3 failures share one root cause: the column `app_user.must_change_password` does not exist in the test database, but the login, set-password and reset-password routes use it (see Findings).

**Result key:** Pass | Fail | Not implemented | Not tested (UI/E2E, later sprint)

## Features to Test
- Register/Sign-Up an account
- Login into account
- Logout of an account
- Access Control
- Set/Reset password

## Pass-Fail Conditions and Results

### Register
| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| The email is successfully registered. | POST valid name, email and password to `/api/register`. | API returns 201 and creates a `pending` account waiting for Superadmin approval. The password is stored hashed. | Any other status, or no row created. | **Pass** (API). Note: there is no verify-email step in the code, so the expected result was reworded. | `register.test.jsx`, `register.integration.test.jsx` |
| The email field is empty. | POST an empty body. | API returns 400 "Please fill in all required fields." | The request is accepted. | **Pass** (API). Limitation: the body is entirely empty, so a case with only the email empty is not isolated. | `register.test.jsx` |
| The email is improperly formatted. | POST 7 invalid emails: missing @, missing local part, missing domain, no TLD, contains space, double @, dot-only domain. | API returns 400 "Please enter a valid email address." for each. | Any invalid email is accepted. | **Pass** (7/7) | `register.test.jsx` |
| The email is already used. | POST an email that already exists. | API returns 409 "This email is already registered." and inserts nothing. | The request is accepted. | **Pass** (mocked lookup) | `register.test.jsx` |
| The password is weak (added). | POST 5 passwords, each breaking one rule: too short, no lowercase, no uppercase, no digit, no special character. | API returns 400 with the password rules message. Nothing is inserted. | Any weak password is accepted. | **Pass** (5/5) | `register.test.jsx` |

### Login
| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| Login is successful. | POST the seeded regular user's email and password to `/api/auth/login`. | API returns 200 with `redirect: "/dashboard"` and creates a session. | API returns an error. | **Fail**: received 401, expected 200. Blocked on dev: the route's query selects `must_change_password`, which does not exist. | `login.test.jsx` |
| Password is wrong. | POST a valid email with a wrong password. | API returns 401 "Invalid email or password." | The request succeeds. | **Pass** (API), with a caveat: the 401 currently also comes from the failed query, so this does not yet prove the password check. Recheck after the column is fixed. | `login.test.jsx` |
| The email is unknown. | POST an email that is not registered. | API returns 401 with the same message as a wrong password (by design, so accounts can't be probed). | The request succeeds. | **Pass** (API), same caveat as above. | `login.test.jsx` |
| The user is blocked. | POST the seeded blocked user's credentials. | API returns 403 "Your account is blocked." | The request succeeds. | **Fail**: received 401, expected 403. Same cause as login success. | `login.test.jsx` |

### Logout
| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| Log out successfully. | Call the logout route while signed in. | API returns 200 and clears the session cookie. Protected pages send `Cache-Control: no-store`. | The cookie is not cleared. | **Pass** (API and header). Browser Back-button behavior: **Not tested** (E2E, later sprint). | `logout.test.jsx`, `session.test.jsx`, `proxy.test.jsx` |

### Access Control
| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| Opening the protected page unauthenticated. | Request `/dashboard` and `/set-password` with no cookie, a garbage cookie, or a token signed with another secret. | Redirected to `/login`. The dashboard page also redirects when there is no session. | The page is shown. | **Pass** | `proxy.test.jsx`, `dashboard.test.jsx`, `session.test.jsx` |
| First login must set a password. | Request `/dashboard` with `mustChange: true`. | Redirected to `/set-password`. | The dashboard is shown. | **Pass** (added) | `proxy.test.jsx`, `dashboard.test.jsx` |
| Opening the protected page without required privileges. | Open a restricted page as a User. | The user is denied. | The user can view the page. | **Not implemented**: no runtime role check exists. The dashboard only displays the role, and `proxy.ts` checks login and password-change status only. | None |

### Set/Reset password
| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| The password is reset successfully. | Set a new password while signed in, or reset it with a valid token. | API returns success, stores a new hash, and the old password no longer works. | An error, or the old password still works. | **Mocked: Pass. Real database: Fail** (set-password returns 500; the reset valid-link path is blocked by the same column and was not run against the real database). | `set-password.test.jsx`, `set-password.integration.test.jsx`, `reset-password.test.jsx` |
| The password field is empty. | Submit an empty or missing password. | API returns 400 with the password rules message. Nothing is updated and the reset token is not used up. | The request is accepted. | **Pass** (API) | `set-password.test.jsx`, `reset-password.test.jsx` |
| The password has too few characters. | Submit `Ab1!`. | 400, nothing updated. | Accepted. | **Pass** | same |
| The password has no special character. | Submit `Abcdefg1`. | 400, nothing updated. | Accepted. | **Pass** | same |
| The password has no uppercase letter. | Submit `abcdef1!`. | 400, nothing updated. | Accepted. | **Pass** | same |
| The password has no number. | Submit `Abcdefg!`. | 400, nothing updated. | Accepted. | **Pass** | same |
| The link to reset the password is valid. | POST a valid, unused, unexpired token with a strong password. | API accepts it, marks the token used, and updates the password. | The link is rejected. | **Pass** (mocked: query asks for `is_used = false` and a future `expires_at`). The "reset screen shows up" part is UI: **Not tested**. | `reset-password.test.jsx` |
| The link to reset the password is expired. | Insert a token with a past `expires_at`, then POST it. | API returns 400 `INVALID_LINK`. | The reset is accepted. | **Pass** (real database). Note: the message is the same for expired, used and unknown tokens, by design. | `reset-password.integration.test.jsx` |
| The link to reset the password is already used. | Insert a token with `is_used = true`, then POST it. | API returns 400 `INVALID_LINK`. | The reset is accepted. | **Pass** (real database), same note. | `reset-password.integration.test.jsx` |
| Password and confirmation do not match (added). | Submit different `password` and `confirm` values. | 400 `MISMATCH`. | Accepted. | **Reset route: Pass. Set-password route: Fail (known bug, tracked with `test.failing`)**: it reads `confirm` but never compares it. | `reset-password.test.jsx`, `set-password.test.jsx` |

## Scope Note
Tests run at the API and route level. Scenarios that describe UI behavior ("the site prompts", "blocks the user from submitting", "is routed to the dashboard", Back button) are **Not tested** and planned for a later sprint with E2E.

## Notes For Dev
1. **Missing column `app_user.must_change_password`.** The login, set-password and reset-password routes use it. Evidence: the login query returns `column app_user.must_change_password does not exist`. Effect: every login returns 401, set-password returns 500, and the reset valid-link path would fail after the token is consumed. Fix: run the migration that adds the column, or remove it from the code.
2. **The login route ignores the query's `error`.** A schema problem shows up as "Invalid email or password" instead of a 500, which hides this bug.
3. **The set-password route ignores `confirm`.** A mismatch is accepted.
4. **No runtime role check.** Nothing separates User, Admin and Superadmin.
5. **Reset flow consumes the token before updating the user.** If the update fails, the link is burned.

## Test Accounts
|Account|Use|How To Create|
|-------|---|-------------|
|Regular User|Login, Logout, Access Control|Seed script (`npm run seed:user`), `seed.user@hope.erp.com`|
|Blocked User|Blocked Login, Access Control|Seed script, `is_blocked = true`|
|Admin|Access Control|Seed script|
|Superadmin|Access Control|Seed script|