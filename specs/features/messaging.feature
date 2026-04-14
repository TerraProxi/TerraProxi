Feature: Conversation Listing
  Verify conversation discovery and filtering

  Scenario: List all conversations for currently authenticated user
    Given the user is logged in with valid token
    And the user has 3 conversations with the following last_messages
      | conversation_id | partner_id | last_message        | last_message_at      | unread_count |
      | 1               | 2          | "Thanks for order"  | 2024-12-15 10:00:00 | 0            |
      | 2               | 3          | "Will deliver soon" | 2024-12-16 12:00:00 | 2            |
      | 3               | 1          | "Can I help?"       | 2024-12-17 08:00:00 | 1            |
    When the user requests their conversations
    Then the response includes all 3 conversations
    And conversations are sorted by last_message_at descending

  Scenario: Filter conversations by unread count
    Given the user has conversations with the following unread counts
      | conversation_id | partner_id | unread_count |
      | 1               | 2          | 0            |
      | 2               | 3          | 2            |
      | 3               | 1          | 0            |
    When the user requests conversations filtered by unread_count gt 0
    Then the response includes only conversation 2
    And unread conversations are prioritized

  Scenario: Sort conversations by last message content
    Given the user has conversations with the following last_messages
      | conversation_id | partner_id | last_message        |
      | 1               | 2          | "Order received!"   |
      | 2               | 3          | "Product ready"     |
    When the user requests conversations sorted by last_message_content
    Then the results are sorted alphabetically by last_message

  Scenario: Empty conversation list
    Given the user is logged in with valid token
    And the user has no conversations
    When the user requests their conversations
    Then the response is empty
    And the user can start new conversations

  Scenario: Unread count updates with new messages
    Given the user has conversation 1 with unread_count 0
    And the user receives a new message in conversation 1
    When the user requests their conversations
    Then the unread_count for conversation 1 is incremented to 1
    And the unread_count is correctly reflected

Feature: Conversation Viewing
  Verify conversation detail retrieval

  Scenario: View conversation with partner
    Given the user is logged in with valid token
    And conversation 1 exists with the following messages
      | id           | conversation_id | sender_id | message_body      | sent_at           | is_read |
      | msg_1        | 1               | 2         | "Hi there!"       | 2024-12-15 09:00:00 | true    |
      | msg_2        | 1               | 1         | "Hello!"          | 2024-12-15 09:05:00 | true    |
      | msg_3        | 1               | 2         | "Thanks!"         | 2024-12-15 10:00:00 | true    |
    And partner 2 is the conversation partner
    When the user requests conversation details with id 1
    Then the response includes all 3 messages
    And the message order is chronological (oldest first)
    And the conversation partner is identified as user 2

  Scenario: View conversation with message pagination
    Given the user has conversation 1 with 50 messages
    When the user requests conversation details with limit 20 and offset 0
    Then the response includes 20 messages
    And the oldest messages are included

  Scenario: Mark messages as read
    Given the user has conversation 1 with unread messages
    And the unread_count is 5
    When the user marks conversation 1 as read
    Then all messages in conversation 1 are marked as read
    And the unread_count is updated to 0
    And the is_read status is true for all messages

  Scenario: Update unread_count for previously read conversation
    Given the user has conversation 1 with unread_count 0
    And a new unread message is sent
    When the user requests their conversations
    Then the unread_count for conversation 1 is updated to 1

  Scenario: Conversation does not exist
    Given the user is logged in with valid token
    When the user requests conversation details with id 999
    Then the request fails with error 404
    And the error message contains "Conversation not found"

  Scenario: Cannot view conversation without authentication
    Given no authentication token is provided
    When the user attempts to view conversation details
    Then the request fails with error 401
    And the error message contains "Authentication required"

Feature: Messaging
  Verify message sending and delivery

  Scenario: Send message successfully
    Given the user is logged in with valid token
    And the user has an active conversation with partner 2
    And the following message content
      | message_body     |
      | "Hello, how are you?" |
    When the user sends the message
    Then the message is created
    And the message_body is saved
    And the message is assigned to the current conversation
    And the sender_id is set to the authenticated user
    And the sent_at timestamp is recorded
    And the conversation last_message_at is updated

  Scenario: Send message with empty body fails
    Given the user is logged in with valid token
    And the empty message body
      | message_body     |
      |                  |
    When the user attempts to send message
    Then the request fails with error 400
    And the error message contains "Message cannot be empty"

  Scenario: Send message with empty conversation fails
    Given the user is logged in with valid token
    And no active conversation exists
    And the following message content
      | message_body     |
      | "Hello!"        |
    When the user attempts to send message
    Then the request fails with error 400
    And the error message contains "No active conversation"

  Scenario: Message length validation
    Given the user is logged in with valid token
    And the following long message body
      | message_body     |
      | "This is a message that exceeds the maximum allowed length limit of 500 characters in length" |
    When the user attempts to send message
    Then the request fails with error 400
    And the error message contains "Message exceeds maximum length"

  Scenario: Send message to non-existent conversation fails
    Given the user is logged in with valid token
    And the user sends message to conversation id 999
    And the following message content
      | message_body     |
      | "Hello!"        |
    When the user attempts to send message
    Then the request fails with error 404
    And the error message contains "Conversation not found"

  Scenario: User receives notification for new messages
    Given the sender sends a message to the user
    And the user is logged in with valid token
    When the sender submits the message
    Then the user receives a push notification
    And the notification includes the message preview

  Scenario: Message delivery status tracking
    Given a message is sent to the partner
    When the sender requests message delivery status
    Then the delivery status is "delivered"
    And the message is confirmed as received

  Scenario: Message timestamp accuracy
    Given the user sends a message
    And the system timestamp is recorded
    When the message is retrieved
    Then the sent_at timestamp matches the system time within 1 minute