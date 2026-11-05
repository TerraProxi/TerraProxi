# language: fr
# Contrat : specs/api/producers-api.yaml (/producers/me/stats, /producers/me/newsletters),
#           specs/api/ai-chat-api.yaml (/ai/newsletter), specs/api/uploads-api.yaml,
#           specs/schemas/producer-stats.schema.json, specs/schemas/newsletter.schema.json
# Vérifié par : apps/api/tests/integration/producer-tools.test.ts, admin-security.test.ts

Fonctionnalité: Tableau de bord et statistiques (BO-1, BO-5)

  Scénario: Chiffres du jour et de la période
    Étant donné deux commandes payées aujourd'hui (9 € et 3 €), une payée il y a 10 jours
    Et une commande non payée
    Quand le producteur consulte ses statistiques sur 7 jours
    Alors le chiffre du jour vaut 12 € pour 2 commandes, le panier moyen 6 €
    Et 3 commandes sont à préparer
    Et la courbe compte 7 jours
    Et "Tomates" est le produit le plus vendu
    Et le fromage, à 4 en stock, est signalé en stock bas
    Quand il consulte ses statistiques sur 30 jours
    Alors la période compte 3 commandes

  Scénario: Réservé au producteur
    Quand un consommateur consulte /producers/me/stats
    Alors la réponse est 403

Fonctionnalité: Newsletter (AI-4)

  Scénario: Envoi aux clients abonnés uniquement
    Étant donné un client abonné ayant payé, un client non abonné ayant payé
    Et un client abonné n'ayant jamais payé
    Quand le producteur envoie une newsletter
    Alors elle compte 1 destinataire
    Et seul le client abonné ayant payé reçoit la notification NEWSLETTER
    Quand le producteur en renvoie une le même jour
    Alors la réponse est 429

  Scénario: Brouillon rédigé par l'IA
    Quand GEMINI_API_KEY n'est pas configurée
    Alors POST /ai/newsletter répond 503
    Quand Gemini est disponible
    Alors le producteur reçoit un objet et un texte à relire
    Et la clé est envoyée dans l'en-tête x-goog-api-key, jamais dans l'URL
    Et un consommateur reçoit 403

Fonctionnalité: Photos (CAT-1)

  Scénario: Envoi d'une photo
    Quand un utilisateur envoie une image PNG
    Alors la réponse est 201 avec une URL publique
    Et l'image est téléchargeable sans compte

  Scénario: Fichier déguisé ou trop lourd
    Quand le fichier "photo.png" contient en réalité un script
    Alors la réponse est 400
    Quand le fichier dépasse 5 Mo
    Alors la réponse est 413
