Feature: Shopping Cart Management
  Verify shopping cart functionality and cart isolation

  Scenario: Add product to cart
    Given the consumer is logged in with valid token
    And consumer 1 has an empty cart
    And product 1 exists with price 5.99 and stock 100
    When the consumer adds product 1 to cart with quantity 2
    Then the cart item is created
    And the quantity is 2
    And the total price is 11.98
    And the cart is saved to the consumer's account

  Scenario: Add product to cart without authentication
    Given product 1 exists with price 5.99 and stock 100
    When the user attempts to add product 1 to cart
    Then the request fails with error 401
    And the error message contains "Authentication required"

  Scenario: Update quantity in cart
    Given the consumer is logged in with valid token
    And consumer 1 has an item in cart with product 1 and quantity 2
    When the consumer updates the quantity to 5
    Then the quantity is updated to 5
    And the total price is recalculated to 29.95
    And the cart is updated

  Scenario: Remove item from cart
    Given the consumer is logged in with valid token
    And consumer 1 has an item in cart with product 1 and quantity 5
    When the consumer removes the item
    Then the item is deleted from cart
    And the cart total is reduced accordingly

  Scenario: Clear cart
    Given the consumer is logged in with valid token
    And consumer 1 has multiple items in cart
    When the consumer clears the cart
    Then all items are removed
    And the cart is empty
    And the total price is 0.00

Feature: Order Creation from Cart
  Verify order creation functionality and stock management

  Scenario: Create order from cart successful
    Given the consumer is logged in with valid token
    And consumer 1 has a cart with the following items
      | product_id | quantity |
      | 1          | 2        |
      | 2          | 3        |
    And product 1 has stock 100
    And product 2 has stock 100
    When the consumer creates an order from cart
    Then the order is created
    And the order status is PENDING
    And the order items are saved with quantities
    And the stock is reduced by item quantities
    And the total order price is calculated

  Scenario: Create order for unavailable product fails
    Given the consumer is logged in with valid token
    And consumer 1 has a cart with product 1
    And product 1 has stock 0
    When the consumer attempts to create order
    Then the order creation fails with error 400
    And the error message contains "Product is out of stock"

  Scenario: Order creation for product with insufficient stock fails
    Given the consumer is logged in with valid token
    And consumer 1 has a cart with product 1 with quantity 10
    And product 1 has stock 5
    When the consumer attempts to create order
    Then the order creation fails with error 400
    And the error message contains "Insufficient stock available"

  Scenario: Create order without any items fails
    Given the consumer is logged in with valid token
    And consumer 1 has an empty cart
    When the consumer attempts to create order
    Then the order creation fails with error 400
    And the error message contains "Cart cannot be empty"

  Scenario: Create order for items from different producers
    Given the consumer is logged in with valid token
    And consumer 1 has a cart with product 1 from producer 1 and product 2 from producer 2
    And the products belong to different producers
    When the consumer attempts to create order
    Then the order is still created
    And the order contains items from both producers
    And the system handles split orders

  Scenario: Order items are correctly created with details
    Given the consumer is logged in with valid token
    And consumer 1 has a cart with product 1 and quantity 2
    And product 1 has price 5.99
    When the consumer creates order
    Then each order item includes
      | product_detail | value      |
      | product_name   | Organic Apple |
      | unit_price     | 5.99       |
      | quantity       | 2          |
      | subtotal       | 11.98      |

Feature: Order Viewing
  Verify order visibility by user role

  Scenario: View own orders as consumer
    Given the consumer is logged in with valid token
    And consumer 1 has orders with the following details
      | order_id | total_price | status   | items_count |
      | 101      | 29.98       | READY    | 5           |
    When the consumer requests their orders
    Then the response includes order 101
    And the response includes order details

  Scenario: View producer orders as producer
    Given the producer is logged in with valid token
    And producer 1 has orders with total_price 49.97 and items_count 7
    When the producer requests their orders
    Then the response includes producers name
    And the response includes order details for their products

  Scenario: Consumer cannot view other consumer's orders
    Given the consumer is logged in with valid token
    And consumer 2 has order 101 with total_price 29.98
    When the consumer requests order 101
    Then the request fails with error 403
    And the error message contains "Cannot access another consumer's order"

Feature: Order Status Updates
  Verify producer role order management

  Scenario: Update order status by producer allowed
    Given the producer is logged in with valid token
    And order 101 has status PENDING
    When the producer updates status to PREPARING
    Then the order status is updated to PREPARING
    And the last updated timestamp is recorded

  Scenario: Update order status through multiple states
    Given order 101 has status PENDING
    And the producer successfully updates status to PREPARING
    Then the order status is PREPARING
    And the producer updates status to READY
    Then the order status is READY
    And the producer updates status to COMPLETED
    Then the order status is COMPLETED

  Scenario: Consumer cannot update order status
    Given the consumer is logged in with valid token
    And order 101 has status PENDING
    When the consumer attempts to update status
    Then the request fails with error 403
    And the error message contains "Only producers can update order status"

  Scenario: Update order status with invalid value fails
    Given the producer is logged in with valid token
    And order 101 has status PENDING
    When the producer attempts to update status to INVALID_STATUS
    Then the.update fails with error 400
    And the error message contains "Invalid status value"

Feature: Order Cancellation
  Verify consumer order cancellation functionality

  Scenario: Cancel order by consumer successful
    Given the consumer is logged in with valid token
    And consumer 1 has order 101 with status READY
    When the consumer requests to cancel order 101
    Then the order status is updated to CANCELLED
    And the order with status CANCELLED is available for deletion after deadline
    And the total buyer price is refunded

  Scenario: Consumer cannot cancel already cancelled order
    Given the consumer is logged in with valid token
    And consumer 1 has order 101 with status CANCELLED
    When the consumer attempts to cancel order 101
    Then the request fails with error 400
    And the error message contains "Order already cancelled"

  Scenario: Consumer cannot cancel in-process order
    Given the consumer is logged in with valid token
    And consumer 1 has order 101 with status PREPARING
    When the consumer attempts to cancel order 101
    Then the request fails with error 400
    And the error message contains "Cannot cancel order in PREPARING status"

  Scenario: Producer cannot cancel order
    Given the producer is logged in with valid token
    And order 101 has status READY
    When the producer attempts to cancel order 101
    Then the request fails with error 403
    And the error message contains "Producers cannot cancel orders"

Feature: Order Filtering and Search
  Verify order lookup by date range

  Scenario: View orders within date range
    Given consumer 1 has orders with the following dates
      | order_id | created_at           |
      | 101      | 2024-12-01 10:00:00  |
      | 102      | 2024-12-15 15:00:00  |
      | 103      | 2025-01-05 12:00:00  |
    When the consumer requests orders within date range 2024-12-01 to 2024-12-31
    Then the response includes orders 101 and 102
    And order 103 is excluded