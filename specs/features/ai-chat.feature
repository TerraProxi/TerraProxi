# language: fr
# Contrat : specs/api/ai-chat-api.yaml, specs/schemas/ai-chat.schema.json
# Vérifié par : apps/api/tests/integration/stripe-ai.test.ts (prévisions) ;
#               l'assistant dépend de Gemini et est vérifié en recette (docs/tests.md §3).

Fonctionnalité: Assistant IA

  Contexte:
    Étant donné un utilisateur connecté
    Et une clé GEMINI_API_KEY configurée

  Scénario: Recherche de producteurs proches
    Quand je demande "Où trouver des fraises près de chez moi ?" avec ma position
    Alors la réponse contient un texte et des liens vers des producteurs du catalogue injecté
    Et aucun producteur ou produit hors de ce catalogue n'est renvoyé

  Scénario: Rayon sans producteur
    Quand je demande avec une position sans producteur dans le rayon
    Alors l'assistant propose les producteurs les plus proches et le signale

  Scénario: Actions sur le panier
    Étant donné mon panier envoyé dans "cart_context"
    Quand je demande d'ajouter 2 kg de tomates
    Alors la réponse contient une action "add_to_cart" sur un produit du catalogue

  Scénario: Requêtes refusées
    Quand j'envoie un message vide
    Alors la réponse est 400
    Quand j'appelle l'assistant sans jeton
    Alors la réponse est 401
    Quand la clé Gemini est absente ou que Gemini ne répond pas
    Alors la réponse est 503

Fonctionnalité: Prévisions de la demande

  Scénario: Réservées au producteur propriétaire
    Étant donné deux producteurs A et B
    Quand A demande la prévision de sa fiche
    Alors il reçoit une ligne par produit avec la prévision et la confiance
    Quand B demande la prévision de la fiche de A
    Alors la réponse est 403
