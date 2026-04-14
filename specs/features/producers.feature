Feature: Producer Listing and Discovery
  Verify producer discovery and search functionality

  Scenario: List all producers nearby with lat/lng/radius filter
    Given producers exist at the following coordinates
      | id  | name                  | latitude  | longitude | distance_from_city_center |
      | 1   | Fresh Farms           | 45.1234   | -93.5678  | 5                        |
      | 2   | Organic Valley       | 45.2345   | -93.6789  | 8                        |
    And the user is at coordinates 45.1000, -93.5000
    And the search radius is 10 km
    When the user requests producers within radius 10 km
    Then the response includes both producers at distances 5 km and 8 km
    And the results are sorted by distance ascending

  Scenario: List producers in primary order by rating
    Given producers exist with the following ratings
      | id  | name              | rating |
      | 1   | Top Rated Farm    | 4.9    |
      | 2   | Good Farmers      | 4.5    |
      | 3   | Average Meadows   | 4.0    |
    When the user requests all producers ordered by rating
    Then the results are sorted by rating descending
    And Top Rated Farm is first in the list

  Scenario: List producers in secondary order by date
    Given producers exist in the following created_at order
      | id  | name         | created_at           |
      | 1   | New Farm     | 2024-12-01 10:00:00  |
      | 2   | Old Farm     | 2024-01-01 10:00:00  |
      | 3   | Very Old Farm | 2023-01-01 10:00:00|
    When the user requests all producers ordered by date ascending
    Then the results are sorted by created_at ascending
    And New Farm is first in the list

  Scenario: Search producers by name
    Given producers exist with the following names
      | id  | name           |
      | 1   | Green Valley   |
      | 2   | Green Gardens  |
      | 3   | Red Barn Food   |
    And the search query is "Green"
    When the user searches for producers with query "Green"
    Then the response includes only Green Valley and Green Gardens
    And Red Barn Food is not included in results

  Scenario: Search producers by description
    Given producers exist with the following descriptions
      | id  | name              | description                      |
      | 1   | Organic Paradise  | We sell organic vegetables        |
      | 2   | Fruit Farm        | Fresh seasonal fruits            |
    And the search query is "organic vegetables"
    When the user searches for producers with query "organic vegetables"
    Then the response includes only Organic Paradise
    And Fruit Farm is not included in results

  Scenario: Empty search results for non-matching query
    Given the search query is "NonExistentFarm"
    When the user searches for producers with query "NonExistentFarm"
    Then the response is empty
    And the status code is 200

Feature: Producer Profile Management
  Verify producer profile viewing and editing

  Scenario: View single producer profile
    Given a producer exists with id 1
    And profile data
      | name           | email            | address              | phone         | bio             |
      | Top Producer   | producer@test.com | 123 Main Street      | +1234567890   | Quality products|
    When the user requests producer profile with id 1
    Then the response includes all profile details
    And the profile is read-only for consumers

  Scenario: Require authentication to view producer profile
    Given no authentication token is provided
    When the user requests producer profile with id 1
    Then the response fails with error 401
    And the error message contains "Authentication required"

  Scenario: Producer views own profile
    Given the producer is logged in with valid token
    And the producer id is 1
    And profile data
      | name           | email            | address              | phone         | bio             |
      | Top Producer   | producer@test.com | 123 Main Street      | +1234567890   | Quality products|
    When the producer requests their own profile
    Then the response includes all profile details
    And the producer is authorized to view only their own data

  Scenario: Producer profile not found
    Given the user requests producer profile with id 999
    When the user attempts to access the profile
    Then the response fails with error 404
    And the error message contains "Producer not found"

  Scenario: Producer unauthorized access to another producer profile
    Given the producer is logged in with valid token for producer id 1
    And producer id 2 has different data
    When the producer requests producer profile with id 2
    Then the response fails with error 403
    And the error message contains "Unauthorized to access this profile"

Feature: Producer Profile Creation and Update
  Verify producer profile management functionality

  Scenario: Create producer profile as authenticated producer
    Given the producer is logged in with valid token
    And the producer id is 1
    And the following profile data
      | name           | email            | address              | phone           | description              | hours_open     | logo_url  | cover_image_url |
      | New Producer   | producer@test.com | 999 Main Street     | +1234567890     | Premium organic goods    | 08:00-20:00    | logo.jpg  | cover.jpg       |
    When the producer submits profile creation
    Then the profile is successfully created
    And the producer id is set to 1
    And the profile is associated with the authenticated producer

  Scenario: Create producer profile without authentication fails
    Given no authentication token is provided
    And the following profile data
      | name           | email            | address              | phone             | description              | hours_open     | logo_url  | cover_image_url |
      | Unauthorized   | test@test.com    | 888 Main Street      | +8888888888       | No goods                 | 00:00-00:00    | logo.jpg  | cover.jpg       |
    When the user attempts to create profile
    Then the request fails with error 401
    And the error message contains "Authentication required"

  Scenario: Update existing producer profile
    Given the producer is logged in with valid token
    And the producer id is 1
    And the current profile exists
    And the following updated profile data
      | name           | email            | address               | phone            | description              | hours_open     | logo_url  | cover_image_url   |
      | Updated Farm   | producer@test.com. | 999 Updated St        | +1234567890.     | Quality organic products | 07:00-22:00    | logo2.jpg | cover2.jpg        |
    When the producer submits update with id 1
    Then the profile is successfully updated
    And the name is changed to Updated Farm
    And the address is updated to 999 Updated St
    And the hours are updated to 07:00-22:00

  Scenario: Update profile with invalid business name format
    Given the producer is_logged in with valid token
    And the producer id is 1
    And the following invalid profile data
      | name           | email            | address               | phone            | description              |
      | 123 Invalid    | producer@test.com | 999 Updated St        | +1234567890      | Quality products         |
    When the producer submits profile update
    Then the update fails with error 400
    And the error message contains "Invalid business name format"

  Scenario: Update profile with invalid email format
    Given the producer is logged in with valid token
    And the producer id is 1
    And the following invalid profile data
      | name            | email        | address               | phone            | description                |
      | Valid Name      | @invalid.com | 999 Updated St        | +1234567890      | Quality products          |
    When the producer submits profile update
    Then the update fails with error 400
    And the error message contains "Invalid email format"

  Scenario: Producer cannot update another producer profile
    Given the producer is logged in with valid token for producer id 1
    And producer id 2 exists with different information
    When the producer attempts to update profile with id 2
    Then the update fails with error 403
    And the error message contains "Unauthorized to update this profile"

  Scenario: Update profile with non-existent producer fails
    Given the producer is logged in with valid token
    And the producer id is 1
    When the producer attempts to update profile with id 999
    Then the update fails with error 404
    And the error message contains "Producer not found"

  Scenario: Update profile without required fields
    Given the producer is logged in with valid token
    And the producer id is 1
    And the following incomplete profile data
      | name           |
      | Valid Name     |
    When the producer submits profile update without required fields
    Then the update fails with error 400
    And the error message contains "Missing required field"