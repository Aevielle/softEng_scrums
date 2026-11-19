# Test Plan for S1-TST-03

## Test Setup

### Tester
Franchesca E. Ramirez

### Testing Start Time
After Paolo's S1-DEV-05 and S1-DEV-06 are merged.

### Test Setup
Test the User Management screen as a signed-in Superadmin using a test database and seeded or throwaway accounts. Each case must be run independently, and any throwaway users must be cleaned up after testing.

**Result key:** Pass | Fail | Not implemented | Not tested (UI/E2E, later sprint)

## Features to Test

- Add a user
- Edit a user
- Block a user
- Unblock a user

## Pass-Fail Conditions and Results

### User Management

| Scenario | Steps | Pass | Fail | Result | Test |
|---|---|---|---|---|---|
| A Superadmin adds a User. | 1. Sign in as a Superadmin.<br>2. Open **User Management**.<br>3. Click **+ Add User**.<br>4. Enter a first name, last name, and unique email address.<br>5. Select **User** as the role.<br>6. Click **Save user**. | The user is created and appears in the user list with the correct details. A temporary password is displayed once. | The user is not created, the details are incorrect, or no temporary password is displayed. | **Not tested** (UI/E2E, later sprint) | Planned User Management E2E test |
| A Superadmin edits a User. | 1. Open **User Management**.<br>2. Select an existing User.<br>3. Click **Edit**.<br>4. Change the user's name or email address.<br>5. Click **Save user**. | A success message appears and the updated information is displayed in the user list. | The changes are not saved, incorrect information is displayed, or an error occurs. | **Not tested** (UI/E2E, later sprint) | Planned User Management E2E test |
| A Superadmin blocks an active User. | 1. Open **User Management**.<br>2. Find an active User.<br>3. Click **Block**. | The user's status changes to **Blocked**, and the action changes to **Unblock**. The blocked user cannot sign in. | The status remains Active, the action does not change, or the blocked user can still sign in. | **Not tested** (UI/E2E, later sprint) | Planned User Management E2E test |
| A Superadmin unblocks a blocked User. | 1. Open **User Management**.<br>2. Find a blocked User.<br>3. Click **Unblock**. | The user's status changes to **Active**, and the user can sign in again. | The status remains Blocked, the action does not change, or the user cannot sign in. | **Not tested** (UI/E2E, later sprint) | Planned User Management E2E test |