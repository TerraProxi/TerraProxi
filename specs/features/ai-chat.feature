Feature: Assistant IA TerraProxi
  En tant que consommateur
  Je veux discuter avec un assistant IA
  Afin de trouver des producteurs locaux et obtenir des conseils culinaires

  Background:
    Given je suis authentifié en tant que consommateur

  Scenario: Recherche de fournisseurs locaux
    When POST /api/ai/chat with:
      | message | Où acheter des légumes bio ? |
      | lat     | 48.8566                      |
      | lon     | 2.3522                       |
    Then response status is 200
    And response body matches schema "AiChatResponse"
    And response body "reply" is not empty
    And response body "producer_links" is an array

  Scenario: Question culinaire avec contexte producteurs
    When POST /api/ai/chat with:
      | message | Propose une recette avec des tomates et du chèvre |
    Then response status is 200
    And response body matches schema "AiChatResponse"
    And response body "reply" contains "recette"

  Scenario: Conversation avec historique
    When POST /api/ai/chat with:
      | message | Et avec du basilic ? |
      | history | [{"role":"user","content":"Recette tomates"},{"role":"assistant","content":"Voici une salade caprese..."}] |
    Then response status is 200
    And response body matches schema "AiChatResponse"

  Scenario: Message vide rejeté
    When POST /api/ai/chat with:
      | message |   |
    Then response status is 400

  Scenario: Accès sans authentification
    Given je ne suis pas authentifié
    When POST /api/ai/chat with:
      | message | Bonjour |
    Then response status is 401
