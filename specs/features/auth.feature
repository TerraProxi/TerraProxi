# language: fr
# Contrat : specs/api/auth-api.yaml, specs/api/users-api.yaml
# Vérifié par : apps/api/tests/integration/auth.test.ts, admin-security.test.ts,
#               apps/api/tests/unit/security.test.ts

Fonctionnalité: Inscription
  En tant que visiteur, je crée un compte consommateur ou producteur après avoir accepté la
  politique de confidentialité.

  Scénario: Inscription réussie
    Quand je m'inscris avec l'email "Alice@Test.fr", un mot de passe de 8 caractères ou plus et le consentement RGPD
    Alors la réponse est 201
    Et le compte a le rôle "CONSUMER" et l'email "alice@test.fr"
    Et la réponse contient un jeton d'accès et un refresh token
    Et aucun hash de mot de passe n'est renvoyé

  Scénario: Inscription sans consentement RGPD
    Quand je m'inscris avec "gdpr_consent" à false
    Alors la réponse est 400

  Scénario: Email déjà utilisé
    Étant donné un compte existant avec l'email "bob@test.fr"
    Quand je m'inscris avec l'email "bob@test.fr"
    Alors la réponse est 409

  Scénario: Mot de passe trop court
    Quand je m'inscris avec le mot de passe "court"
    Alors la réponse est 400
    Et le détail de l'erreur désigne le champ "password"

Fonctionnalité: Connexion et rôles

  Scénario: Connexion avec les bons identifiants
    Étant donné un compte existant
    Quand je me connecte avec son email et son mot de passe
    Alors la réponse est 200 avec l'utilisateur et une paire de jetons

  Scénario: Mauvais mot de passe
    Quand je me connecte avec un mot de passe erroné
    Alors la réponse est 401

  Scénario: Route protégée sans jeton ou avec un jeton invalide
    Quand j'appelle GET /users/profile sans jeton
    Alors la réponse est 401
    Quand j'appelle GET /users/profile avec un jeton invalide
    Alors la réponse est 401

  Scénario: Rôle insuffisant
    Étant donné un consommateur connecté
    Quand il crée un produit
    Alors la réponse est 403

Fonctionnalité: Sessions

  Scénario: Le refresh token est à usage unique
    Étant donné un compte connecté avec un refresh token
    Quand j'échange ce refresh token sur /auth/refresh
    Alors je reçois une nouvelle paire de jetons
    Quand je réutilise l'ancien refresh token
    Alors la réponse est 401

  Scénario: Déconnexion
    Quand je me déconnecte avec mon refresh token
    Alors la réponse est 204
    Et ce refresh token ne permet plus de renouveler la session

  Scénario: Changement de mot de passe
    Quand je change mon mot de passe avec un mot de passe actuel erroné
    Alors la réponse est 403
    Quand je change mon mot de passe avec le bon mot de passe actuel
    Alors la réponse est 204
    Et l'ancien mot de passe est refusé à la connexion
    Et toutes mes sessions ouvertes sont révoquées

Fonctionnalité: Supervision

  Scénario: Santé de l'API
    Quand j'appelle GET /health
    Alors la réponse est 200 avec "status" à "ok" et "database" à "up"

Fonctionnalité: Protection contre les tentatives frauduleuses (CDC « Sécurisation »)

  Scénario: Force brute sur un compte
    Étant donné un compte existant
    Quand 5 connexions échouent depuis la même adresse
    Alors la 6e tentative répond 429 avec l'en-tête Retry-After, même avec le bon mot de passe

  Scénario: Une connexion réussie remet le compteur à zéro
    Étant donné 4 échecs de connexion
    Quand je me connecte avec le bon mot de passe
    Alors la réponse est 200 et un nouvel échec répond 401

  Scénario: Compte suspendu ou supprimé
    Quand le compte est suspendu par un administrateur ou supprimé
    Alors son jeton d'accès est refusé (401) dès la requête suivante, sans attendre son expiration

  Scénario: Secret JWT faible en production
    Quand l'API démarre en production avec un JWT_SECRET de moins de 32 caractères ou celui de .env.example
    Alors elle refuse de démarrer

  Scénario: URL piégée (XSS stockée)
    Quand un producteur enregistre une photo "javascript:alert(1)" ou un site "data:text/html,…"
    Alors la réponse est 400
    Quand il enregistre une chaîne vide
    Alors le champ est effacé
