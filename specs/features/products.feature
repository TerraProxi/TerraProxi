Feature: Product Listing and Discovery
  Verify product listing and search functionality across producers

  Scenario: List products by specific producer
    Given the producer "Fresh Farms" has the following products
      | id  | name        | category   | price | stock | description                  |
      | 1   | Organic     | vegetables | 5.99  | 100   | Fresh organic vegetables      |
      | 2   | Apples      | fruits     | 3.99  | 200   | Sweet apples                 |
    And the user is authenticated
    When the user requests products from producer "Fresh Farms"
    Then the response includes both products
    And all products are sorted by name ascending

  Scenario: List products with category filter
    Given producer "Organics Inc" has products in both categories
      | id  | name       | category   | price | stock | description |
      | 1   | Carrots    | vegetables | 2.99  | 150   | Fresh carrots |
      | 2   | Corn       | grains     | 4.99  | 80    | Sweet corn |
    When the user requests products filtered by category "vegetables"
    Then the response includes only Carrots
    And Corn is not included

  Scenario: List products with price range filter
    Given producer "Quality Farm" has products
      | id  | name    | price | stock | description |
      | 1   | Eggs    | 3.99  | 500   | Fresh eggs |
      | 2   | Milk    | 5.49  | 300   | Fresh milk |
      | 3   | Cheese  | 7.99  | 100   | Premium cheese |
    When the user requests products with min_price 4.00 and max_price 6.00
    Then the response includes only Milk
    And Eggs and Cheese are filtered out

  Scenario: List products with multiple category filter
    Given producer "MultiProduct" has products from multiple categories
      | id  | name       | category   | price | stock | description |
      | 1   | Carrots    | vegetables | 2.99  | 150   | Fresh carrots |
      | 2   | Tomatoes   | vegetables | 3.99  | 120   | Fresh tomatoes |
      | 3   | Milk       | dairy      | 5.49  | 300   | Fresh milk |
    When the user requests products filtered by categories ["vegetables", "dairy"]
    Then the response includes Carrots, Tomatoes, and Milk
    And all three products are in the result

  Scenario: List all available products from all producers
    Given multiple producers exist with products
      | producer_id | product_id | name     | price | stock |
      | 1           | 1          | Apples   | 3.99  | 200   |
      | 1           | 2          | Bananas  | 2.99  | 250   |
      | 2           | 3          | Milk     | 5.49  | 300   |
      | 2           | 4          | Eggs     | 3.99  | 500   |
    When the user requests all available products
    Then the response includes all 4 products
    And results are sorted by producer name and product name
    And Apples and Bananas are from producer 1
    And Milk and Eggs are from producer 2

  Scenario: List products by last_updated filter
    Given producer "Seasonal Farm" has products
      | id  | name        | last_updated |
      | 1   | Carrots     | 2024-12-15 10:00:00 |
      | 2   | Radishes    | 2024-12-16 10:00:00 |
    When the user requests products updated after 2024-12-15
    Then the response includes only Radishes
    And Carrots is filtered out

  Scenario: Empty product list for producer
    Given producer "Empty Producer" has no products
    When the user requests products from this producer
    Then the response is empty
    And the status code is 200

  Scenario: Product not found
    Given the user requests product with id 999
    When the user attempts to get product details
    Then the response fails with error 404
    And the error message contains "Product not found"

  Scenario: Product soft deleted is not listed
    Given product id 1 exists but is soft deleted
    When the user requests all products
    Then the product is not included in the results
    And the result is empty for soft deleted items

Feature: Product Details and Viewing
  Verify product detail retrieval and validation

  Scenario: View product details with pricing and stock
    Given a product exists with id 1
    And the product data
      | id  | name         | producer_id | category   | price | stock | description      |
      | 1   | Organic Milk | 1           | dairy      | 5.99  | 300   | Fresh milk       |
    When the user requests product details with id 1
    Then the response includes full product details
    And price is 5.99
    And stock is 300
    And description is "Fresh milk"

  Scenario: Require authentication to view product details
    Given no authentication token is provided
    When the user requests product details with id 1
    Then the response fails with error 401
    And the error message contains "Authentication required"

  Scenario: Product details include producer information
    Given the product exists with id 1
    And producer data
      | id   | name         |
      | 1    | Organic Farm |
    When the user requests product details with id 1
    Then the producer name is included in the product details
    And the producer id is correctly referenced

  Scenario: Product details with images
    Given the product exists with id 1
    And product media data
      | id  | product_id | url  | type   |
      | 1   | 1          | img1.jpg | main_image |
    When the user requests product details with id 1
    Then the product details include media URLs
    And the main image is marked as main_image

Feature: Product Creation and Management
  Verify product creation, update, and deletion functionality

  Scenario: Create new product as authenticated producer
    Given the producer is logged in with valid token
    And the producer id is 1
    And the following product data
      | name          | category        | price | stock | description          |
      | Organic Eggs  | dairy           | 5.99  | 300   | Fresh organic eggs    |
    When the producer submits product creation
    Then the product is successfully created
    And the product id is assigned
    And the producer id is set to 1
    And the product belongs to the authenticated producer

  Scenario: Create product with insufficient stock value
    Given the producer is logged in with valid token
    And the following product data
      | name          | category   | price | stock | description |
      | Invalid Item  | vegetables | -5.00 | 500   | Bad product |
    When the producer attempts to create product
    Then the creation fails with error 400
    And the error message contains "Price must be greater than zero"
    And the error message contains "Stock must be greater than zero"

  Scenario: Create product without required fields
    Given the producer is logged in with valid token
    And the following incomplete product data
      | name          |
      | Test Item     |
    When the producer submits product creation
    Then the creation fails with error 400
    And the error message contains "Category is required"
    And the error message contains "Price is required"
    And the error message contains "Stock is required"

  Scenario: Create product with invalid category
    Given the producer is logged in with valid token
    And the following product data
      | name          | category | price | stock | description |
      | Test Item     | invalid  | 10.00 | 100   | Test description |
    When the producer submits product creation
    Then the creation fails with error 400
    And the error message contains "Invalid category"

  Scenario: Update existing product details
    Given the producer is logged in with valid token
    And the producer id is 1
    And the product exists
    And the following updated product data
      | name          | category   | price | stock | description |
      | Updated Eggs  | dairy      | 7.99  | 400   | Updated description |
    When the producer submits product update
    Then the product is successfully updated
    And the price is changed to 7.99
    And the stock is changed to 400
    And the description is updated

  Scenario: Update product with invalid stock value
    Given the producer is logged in with valid token
    And the product exists
    And the following updated product data
      | name          | category   | price | stock | description |
      | Bad Item      | vegetables | 25.00 | -100  | Negative stock |
    When the producer attempts product update
    Then the update fails with error 400
    And the error message contains "Stock must be greater than zero"

  Scenario: Produce cannot update another producer product
    Given the producer is logged in with valid token for producer id 1
    And producer id 2 has product id 1
    When the producer attempts to update product with id 1
    Then the update fails with error 403
    And the error message contains "Unauthorized to update this product"

  Scenario: Delete product successfully
    Given the producer is logged in with valid token
    And the product exists with id 1
    When the producer submits product deletion
    Then the product is soft deleted
    And the product is not visible in listing
    And the deletion timestamp is recorded

  Scenario: Producer cannot delete another producer product
    Given the producer is logged in with valid token for producer id 1
    And producer id 2 has product id 1
    When the producer attempts to delete product with id 1
    Then the deletion fails with error 403
    And the error message contains "Unauthorized to delete this product"

  Scenario: Attempt to delete non-existent product fails
    Given the producer is logged in with valid token
    When the producer attempts to delete product with id 999
    Then the deletion fails with error 404
    And the error message contains "Product not found"

  Scenario: Cannot delete product already in cart
    Given the producer is logged in with valid token
    And the product exists with id 1
    And the product is in a consumer's cart
    When the producer attempts to delete product with id 1
    Then the deletion fails with error 400
    And the error message contains "Product is in use"

  Scenario: Restore soft deleted product
    Given the producer is logged in with valid token
    And the product is soft deleted with id 1
    When the producer restores the product
    Then the product is back to active state
    And the product is visible in listing again

  Scenario: Cannot create product without authentication
    Given no authentication token is provided
    When the user attempts to create product
    Then the request fails with error 401
    And the error message contains "Authentication required"