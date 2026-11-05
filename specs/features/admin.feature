# language: fr
# Contrat : specs/api/admin-api.yaml
# Vérifié par : apps/api/tests/integration/admin-security.test.ts

Fonctionnalité: Administration de la plateforme
  Un administrateur suit l'activité, modère les comptes et vérifie les exploitations.

  Scénario: Accès réservé
    Quand un consommateur ou un producteur appelle /admin/stats ou /admin/users
    Alors la réponse est 403
    Quand un visiteur sans compte appelle /admin/stats
    Alors la réponse est 401

  Scénario: Indicateurs et recherche
    Étant donné un producteur non vérifié et une commande payée de 9 €
    Quand l'administrateur consulte les indicateurs
    Alors il voit 1 client, 1 producteur à vérifier et 9 € de chiffre d'affaires
    Quand il cherche un compte par email
    Alors seul ce compte est renvoyé

  Scénario: Suspension d'un compte
    Quand l'administrateur suspend un client
    Alors le jeton d'accès du client est refusé dès la requête suivante
    Et son refresh token et sa connexion sont refusés
    Quand l'administrateur le réactive
    Alors le client peut se reconnecter
    Quand l'administrateur tente de suspendre son propre compte
    Alors la réponse est 400

  Scénario: Vérification d'un producteur
    Étant donné un producteur en attente de vérification
    Quand l'administrateur le vérifie
    Alors sa fiche publique porte is_verified à true
    Et il reçoit la notification "Exploitation vérifiée"
