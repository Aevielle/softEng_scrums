# Test Plan for Sprint 1

## Test Setup
### Tester 
Franchesca E. Ramirez
### Testing Start Time
After Paolo's S1-DEV-02, S1-DEV-03, and S1-DEV-04 are merged.
### Test Setup
Automated tests using Jest

## Features to Test
- Register/Sign-Up an account 
- Login into account
- Logout of an account
- Access Control
- Set/Reset password

## Pass-Fail Conditions
### Register
| Scenario | Pass | Fail |
|---|---|---|
|The email is successfully registered.| The site prompts user to verify email.| The site doesn't route to the verify email screen.|
|The email field is empty.| The site informs the user that the email field is empty and blocks user from submitting the blank field.|The form still submits instead of displaying an error message.|
|The email is improperly formatted.|The site informs user that the email is an invalid format and blocks user from submitting the invalid email. |The form still submits instead of displaying an error message.|
|The email is already used.|The site informs user that the account already exists| The form still submits instead of displaying an error message.|
### Login
| Scenario | Pass | Fail |
|---|---|---|
|Login is successful| The user is routed to the dashboard.|The user stays on the login page and gets an error.|
|Password is wrong.| The user is prompted that the password is wrong.|The user is still routed to the dashboard.|
|The email is unknown.|The user is prompted that the email doesn't exist in the site. |The user is still routed to the dashboard.|
|The user is blocked.|The user is prompted that the account has been blocked |The user is still routed to the dashboard.|
### Logout
| Scenario | Pass | Fail |
|---|---|---|
|Log out successfully.| The user is sent back to the home page. | The user is not sent back to the home page or clicking the Back button still shows the dashboard.|
### Access Control
| Scenario | Pass | Fail |
|---|---|---|
| Opening the protected page as an unauthenticated user.| The user is informed that they cannot access the protected page.|The user is able to view the protected page. |
| Opening the protected page without required privileges | The user is informed that they lack privileges to access the protected page. | The user is able to view the protected page.|
### Set/Reset password
| Scenario | Pass | Fail |
|---|---|---|
|The password is reset successfully.| The user is prompted that the reset was successful.| The user receives no confirmation that the reset was successful or/and the old password still works.|
|The password field is empty.| The site prompts user not to leave the password field blank and prevents user from submitting the blank password field. | The form still submits instead of displaying an error message.|
|The password has too few characters.|The site prompts user to add more characters and blocks user from submitting.|The form still submits instead of displaying an error message.|
|The password doesn't have any special character in it.| The site prompts user to add at least one special character and blocks user from submitting.| The form still submits instead of displaying an error message.|
|The password doesn't have an uppercase letter.| The site prompts user to add at least one uppercase letter and blocks user from submitting.| The form still submits instead of displaying an error message.|
|The password doesn't have a number.|The site prompts user to add at least one number and blocks user from submitting.| The form still submits instead of displaying an error message.|
|The link to reset the password is valid.| The reset password screen shows up.| The reset password screen doesn't show up.|
|The link to reset the password is expired.| The user is informed that the link is expired.| The reset password screen shows up.|
|The link to reset the password is already used.| The user is informed that the link was already used.| The reset password screen shows up.|