# Tâches pour les étudiants de première année (B1) - Projet TerraProxi

Voici une liste de 10 tâches simples, progressives et isolées, idéales pour des étudiants en première année. Elles leur permettront de se familiariser avec les technologies du projet (React, Bun/Elysia) sans être bloqués par l'architecture globale.

## Frontend (React Web & UI)

**1. Création du composant "Bouton" (UI Kit)**
- **Objectif :** Créer un composant React réutilisable `<Button />`.
- **Détails :** Ce bouton doit accepter des "props" pour changer son style (primaire en vert `#5BAE6A`, secondaire en bleu `#76CCD6`, ou texte) et son état (actif, désactivé). Il doit utiliser la police Montserrat.
- **Compétences :** React (Props), CSS/SCSS basique.

**2. Intégration de la "Carte Produit"**
- **Objectif :** Intégrer visuellement une carte affichant les informations d'un produit local.
- **Détails :** Le composant `<ProductCard />` doit afficher une image, le nom du produit, le prix au kilo, et un bouton "Ajouter au panier". Le design doit faire pro (bords arrondis, léger ombrage).
- **Compétences :** HTML, CSS (Flexbox/Grid), React.

**3. Intégration des composants globaux (Navbar & Footer)**
- **Objectif :** Créer la barre de navigation et le pied de page de l'application web.
- **Détails :** La navbar doit contenir le logo à gauche, une barre de recherche au centre, et les liens/icônes de profil et panier à droite. Le footer contiendra des liens factices (Mentions légales, Contact).
- **Compétences :** CSS, HTML sémantique.

**4. Création des formulaires d'Authentification (Visuel seul)**
- **Objectif :** Construire l'interface des pages de connexion et d'inscription.
- **Détails :** Créer les champs (input) pour l'email, le mot de passe, et les boutons de validation. L'objectif est d'avoir de beaux formulaires (états "focus", messages d'erreur stylisés) sans se soucier de l'envoi des données au backend pour le moment.
- **Compétences :** Formulaires HTML, CSS.

## Backend & Données (Bun.js / Elysia.js)

**5. Création d'une route "Healthcheck"**
- **Objectif :** Faire sa première route API avec Elysia.js.
- **Détails :** Créer un endpoint `GET /api/health` qui retourne simplement un JSON `{"status": "ok", "timestamp": "..."}`. C'est parfait pour comprendre comment lancer le serveur et tester une route avec le navigateur ou Postman.
- **Compétences :** JavaScript, Bases d'une API REST.

**6. Création d'un jeu de fausses données (Faker/Mock)**
- **Objectif :** Fournir des données factices au Frontend en attendant la vraie BDD.
- **Détails :** Créer un fichier `mockData.json` (ou un script JS) contenant une liste de 10 producteurs fictifs et 30 produits locaux (avec de fausses URLs d'images). 
- **Compétences :** Structure de données JSON.

**7. Création d'une API retournant le catalogue (Mocké)**
- **Objectif :** Relier la route API aux fausses données.
- **Détails :** Créer une route `GET /api/products` avec Elysia qui lit le fichier JSON de la tâche précédente et le renvoie au client.
- **Compétences :** Backend, gestion des requêtes HTTP simples.

## Base de données & Infrastructure

**8. Rédaction des scripts de création de tables (SQL)**
- **Objectif :** S'initier à la base de données relationnelle.
- **Détails :** Écrire un fichier `init.sql` contenant les commandes `CREATE TABLE` pour les tables `users` et `products` en s'appuyant sur l'architecture définie.
- **Compétences :** Bases du langage SQL.

## Transverse & Projets

**9. Préparation au lancement de l'application Mobile**
- **Objectif :** Lancer son premier projet React Native.
- **Détails :** Installer les outils nécessaires (Expo CLI), initialiser le projet dans le dossier `apps/mobile`, lancer le projet sur un émulateur ou via l'application Expo Go sur leur téléphone, et afficher "Bienvenue sur TerraProxi" à l'écran.
- **Compétences :** Ligne de commande, découverte de l'écosystème mobile.

**10. Rédaction du guide d'installation pour les développeurs**
- **Objectif :** Documenter comment un développeur doit installer le projet.
- **Détails :** Rédiger (ou compléter) le fichier `README.md` (ou `docs/setup.md`) pour lister les prérequis (installer Node.js, Bun, Docker) et les commandes à taper (`npm install`, `bun run dev`, etc.) pour lancer le projet.
- **Compétences :** Markdown, vulgarisation technique.
