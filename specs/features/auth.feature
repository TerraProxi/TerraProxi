Feature: Consumer Registration
  Verify consumer account registration with all validation rules

  Scenario: Register consumer with all required fields successful
    Given the following incomplete registration data
      | email                | password | firstname | lastname | phone          | address                   | privacy_consent | marketing_consent |
      | consumer@example.com | Pass123! | John      | Doe      | +1234567890     | 123 Main St, City 00000   | true            | true             |
    When the consumer submits the registration form
    Then the registration is successful
    And a confirmation email is sent to consumer@example.com
    And the consumer is automatically logged in

  Scenario: Consumer registration with missing required field email
    Given the following incomplete registration data
      | password       | firstname | lastname | phone   | address               | privacy_consent | marketing_consent |
      | Pass123!       | John      | Doe      | +123456 | 123 Main St, City 000 | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Email is required"

  Scenario: Consumer registration with missing required field password
    Given the following incomplete registration data
      | email          | firstname | lastname | phone   | address                | privacy_consent | marketing_consent |
      | consumer@test.com | John      | Doe      | +123456 | 123 Main St, City 000  | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Password is required"

  Scenario: Consumer registration with invalid email format
    Given the following incomplete registration data
      | email           | password | firstname | lastname | phone          | address                     | privacy_consent | marketing_consent |
      | invalid-email   | Pass123! | John      | Doe      | +1234567890     | 123 Main St, City 00000     | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Invalid email format"

  Scenario: Consumer registration with weak password
    Given the following incomplete registration data
      | email          | password | firstname | lastname | phone          | address                      | privacy_consent | marketing_consent |
      | consumer@test.com | weak     | John      | Doe      | +1234567890     | 123 Main St, City 00000      | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Password must be at least 8 characters"

  Scenario: Consumer registration with email already exists
    Given a consumer account already exists with email tester@terra.com
    And the following registration data
      | email          | password    | firstname | lastname | phone          | address        | privacy_consent | marketing_consent |
      | tester@terra.com | StrongPass1 | Alice     | Server   | +9999999999     | 999 Main St    | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 409
    And the error message contains "Email already registered"

  Scenario: Consumer registration without privacy consent
    Given the following registration data
      | email          | password    | firstname | lastname | phone          | address        | privacy_consent | marketing_consent |
      | consumer@test.com | StrongPass1 | John      | Doe      | +1234567890     | 123 Main St    | false           | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Privacy consent required"

  Scenario: Consumer registration without marketing consent
    Given the following registration data
      | email          | password    | firstname | lastname | phone          | address        | privacy_consent | marketing_consent |
      | consumer@test.com | StrongPass1 | John      | Doe      | +1234567890     | 123 Main St    | true            | false            |
    When the consumer submits the registration form
    Then the registration succeeds
    And the privacy consent is accepted but marketing consent is optional

  Scenario: Consumer registration with phone number format validation
    Given the following registration data
      | email          | password    | firstname | lastname | phone    | address        | privacy_consent | marketing_consent |
      | consumer@test.com | StrongPass1 | John      | Doe      | abc123456 | 123 Main St    | true            | true             |
    When the consumer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Invalid phone number format"

Feature: Producer Registration
  Verify producer account registration process

  Scenario: Register producer with all required fields successful
    Given the following producer registration data
      | bussiness_name      | email                  | password      | address                             | phone          | bio                        | privacy_consent | marketing_consent |
      | Terra Gardens        | producer@terra.com     | Pass123!      | 456 Farm Rd, Agri City 11111        | +1234567890    | Premium organic produce    | true            | true             |
    When the producer submits the registration form
    And admin approval is granted
    Then the producer registration is successful
    And producer dashboard is created
    And the producer can manage their profile

  Scenario: Producer registration with missing business name
    Given the following producer registration data
      | email              | password      | address                 | phone   | bio                    | privacy_consent | marketing_consent |
      | producer@test.com  | Pass123!      | 123 Farm Rd             | +123456 | Premium organic food   | true            | true             |
    When the producer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Business name is required"

  Scenario: Producer registration with existing email in consumer table
    Given a consumer account exists with email consumer@example.com
    And the following incomplete producer registration data
      | bussiness_name      | password      | address                 | phone   | bio                    | privacy_consent | marketing_consent |
      | New Business       | Pass123!      | 789 Business St         | +999999 | Custom business        | true            | true             |
    When the producer submits the registration form
    Then the registration fails with error 400
    And the error message contains "Email already registered as consumer"

Feature: Login and Authentication
  Verify user login functionality and error handling

  Scenario: Login with correct credentials successful
    Given an account exists with email consumer@example.com
    And the password is Pass123!
    And the account is active
    When the consumer submits login with email consumer@example.com and password Pass123!
    Then the login is successful
    And a JWT token is returned
    And access token expires in 24 hours
    And refresh token a valid session is created

  Scenario: Login with wrong password fails
    Given an account exists with email consumer@example.com
    And the stored password is Pass123!
    When the consumer submits login with email consumer@example.com and password WrongPass!
    Then the login fails with error 401
    And the error message contains "Invalid credentials"

  Scenario: Login with non-existent email fails
    Given the consumer submits login with email nonexistent@example.com and password Pass123!
    Then the login fails with error 401
    And the error message contains "Invalid credentials"

  Scenario: Login attempts rate limiting
    Given the user successfully logged in
    And the user attempts login 5 consecutive times with wrong credentials
    When login attempts continue
    Then the login is temporarily locked
    And the error message contains "Too many attempts, please try again later"

  Scenario: Refresh token validation
    Given a valid access token exists
    And a valid refresh token exists
    When the user requests new access token with refresh token
    Then the new access token is returned
    And the old refresh token is invalidated
    And a new refresh token is issued

Feature: Logout
  Verify user logout functionality and session management

  Scenario: Successful consumer logout
    Given the consumer is logged in with valid JWT token
    When the consumer requests logout
    Then the access token is revoked
    And the refresh token is revoked
    And the user is logged out from all devices

  Scenario: Producer logout
    Given the producer is logged in with valid JWT token
    When the producer requests logout
    Then the access token is revoked
    And the refresh token is revoked
    And the user is logged out from all devices

  Scenario: Logout without authentication fails
    Given no valid JWT token exists
    When the user attempts to logout
    Then the request fails with error 401
    And the error message contains "Authentication required"