# language: fr
# Contrat : specs/api/producers-api.yaml, specs/schemas/producer.schema.json
# Vérifié par : apps/api/tests/integration/catalog.test.ts

Fonctionnalité: Fiche producteur
  En tant que producteur, je publie la fiche de mon exploitation pour apparaître sur la carte.

  Scénario: Fiche absente puis créée puis mise à jour
    Étant donné un producteur connecté sans fiche
    Quand il appelle GET /producers/me
    Alors la réponse est 404
    Quand il envoie sa fiche avec un nom et une position
    Alors la réponse est 201
    Quand il renvoie sa fiche avec de nouveaux horaires et sans position
    Alors la réponse est 200 avec le même identifiant
    Et la position précédente est conservée

  Scénario: Fiche réservée au rôle producteur
    Étant donné un consommateur connecté
    Quand il envoie une fiche producteur
    Alors la réponse est 403

Fonctionnalité: Recherche géolocalisée

  Scénario: Producteurs dans un rayon
    Étant donné un producteur situé à Montpellier avec un produit de la catégorie "FRUITS_VEGETABLES"
    Quand je cherche à moins de 5 km de (43.62, 3.87) sans être connecté
    Alors le producteur est renvoyé avec une distance inférieure à 5 km
    Et ses catégories valent ["Fruits & Légumes"]
    Et les résultats sont triés par distance croissante

  Scénario: Aucun producteur hors du rayon
    Quand je cherche à moins de 10 km de Paris
    Alors la liste est vide

  Scénario: Position incomplète
    Quand je cherche avec lat sans lon
    Alors la réponse est 400

  Scénario: Fiche publique
    Quand j'appelle GET /producers/{id} sans être connecté
    Alors la fiche est renvoyée
    Quand j'appelle GET /producers/{id} avec un identifiant qui n'est pas un UUID
    Alors la réponse est 400
