# Test Plan for S1-TST-03

## Test Setup

### Tester
Franchesca E. Ramirez

### Testing Start Time
After Paolo's S1-DEV-05 and S1-DEV-06 are merged.

### Test Setup
Test the User Management screen as a signed-in Superadmin using a test database and seeded or throwaway accounts. Each case must be run independently, and any throwaway users must be cleaned up after testing.

**Result key:** Pass | Fail | Not implemented | Not tested (UI/E2E, later sprint)

## Playwright Results

**Run date:** 2026-11-19  
**Command:** `npx playwright test src/test/e2e/user-man.spec.ts --project=chromium`  
**Result:** 6 passed

The test file creates throwaway users, uses the demo verification code for Admin and Superadmin sign-in, and deletes temporary accounts during cleanup.

## Features to Test

- Add a user
- Edit a user
- Block a user
- Unblock a user
- Approve a pending user
- Make a User an Admin
- Prevent an Admin from seeing or editing a Superadmin
- Prevent the last active Superadmin from being blocked or removed

## Pass-Fail Conditions and Results

### User Management

| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| A Superadmin adds a User. | 1. Sign in as a Superadmin.<br>2. Open **User Management**.<br>3. Click **+ Add User**.<br>4. Enter a first name, last name, and unique email address.<br>5. Select **User** as the role.<br>6. Click **Save user**. | The user is created and appears in the user list with the correct details. A temporary password is displayed once. | The user is not created, the details are incorrect, or no temporary password is displayed. | **Pass** (E2E) | `user-man.spec.ts` |
| A Superadmin edits a User. | 1. Open **User Management**.<br>2. Select an existing User.<br>3. Click **Edit**.<br>4. Change the user's name or email address.<br>5. Click **Save user**. | A success message appears and the updated information is displayed in the user list. | The changes are not saved, incorrect information is displayed, or an error occurs. | **Pass** (E2E) | `user-man.spec.ts` |
| A Superadmin blocks an active User. | 1. Open **User Management**.<br>2. Find an active User.<br>3. Click **Block**. | The user's status changes to **Blocked**, and the action changes to **Unblock**. The blocked user cannot sign in. | The status remains Active, the action does not change, or the blocked user can still sign in. | **Pass** (E2E) | `user-man.spec.ts` |
| A Superadmin unblocks a blocked User. | 1. Open **User Management**.<br>2. Find a blocked User.<br>3. Click **Unblock**. | The user's status changes to **Active**, and the user can sign in again. | The status remains Blocked, the action does not change, or the user cannot sign in. | **Pass** (E2E) | `user-man.spec.ts` |

### Superadmin Approval

| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| A Superadmin approves a pending account. | 1. Sign in as a Superadmin.<br>2. Open **User Management**.<br>3. Find the account under **Pending requests**.<br>4. Click **Approve**. | The account leaves Pending requests and appears as an **Active** User. The approved account can sign in. | The account remains Pending, is not activated, or cannot sign in after approval. | **Pass** (E2E) | `user-man.spec.ts` |
| A Superadmin makes a User an Admin. | 1. Sign in as a Superadmin.<br>2. Open **User Management**.<br>3. Find an active account with the **User** role.<br>4. Click **Make Admin**. | The account's role changes to **Admin** and the new Admin gains the applicable Admin access. | The role remains User, the role changes incorrectly, or the new Admin does not receive the applicable access. | **Pass** (E2E) | `user-man.spec.ts` |

### Role and Superadmin Protection

| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| An Admin cannot see a Superadmin account. | 1. Create or use an active Superadmin account and an active Admin account.<br>2. Sign in as the Admin.<br>3. Open **User Management**.<br>4. Search or review the complete user list. | The Superadmin account is not shown anywhere in the list or pending requests. Directly opening a Superadmin record URL or API endpoint returns Not Found or Access Denied. | The Superadmin account is visible or its details can be retrieved. | **Pass** (E2E/API) | `user-man.spec.ts` |
| An Admin cannot edit a Superadmin account. | 1. Sign in as the Admin.<br>2. Open **User Management**.<br>3. Verify that no Superadmin row or Edit action is available.<br>4. Attempt a direct edit request for a known Superadmin user ID. | The Superadmin has no Edit action, and the direct edit request is rejected with Not Found or Forbidden. | The Admin can open, edit, change, or save the Superadmin account. | **Pass** (E2E/API) | `user-man.spec.ts` |
| The last active Superadmin cannot be blocked. | 1. Ensure exactly one active, unblocked Superadmin exists.<br>2. Sign in as that Superadmin or another authorized Superadmin.<br>3. Open **User Management**.<br>4. Click **Block** on the last Superadmin.<br>5. If direct API testing is used, send the block request for that account. | The system rejects the action. The account remains active and unblocked. | The last Superadmin becomes blocked or the warning is missing. | **Pass** (E2E/API) | `user-man.spec.ts` |
| The last active Superadmin cannot be demoted. | 1. Ensure exactly one active, unblocked Superadmin exists.<br>2. Sign in as that Superadmin or another authorized Superadmin.<br>3. Attempt to change the last Superadmin role to User or Admin.<br>4. If direct API testing is used, send the role-change request. | The system rejects the action. The account remains a Superadmin. | The last Superadmin is demoted. | **Pass** (E2E/API) | `user-man.spec.ts` |
| The last active Superadmin cannot be removed. | 1. Ensure exactly one active, unblocked Superadmin exists.<br>2. Attempt to delete or remove the account. | The system rejects account removal and the account remains a Superadmin. | The account is removed. | **Not implemented** (no remove/delete route) | None yet |