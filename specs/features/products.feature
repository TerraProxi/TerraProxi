# language: fr
# Contrat : specs/api/products-api.yaml, specs/schemas/product.schema.json
# Vérifié par : apps/api/tests/integration/catalog.test.ts

Fonctionnalité: Catalogue public

  Scénario: Filtrer le catalogue
    Étant donné des produits de plusieurs producteurs
    Quand je liste les produits avec producer_id, category, available ou search
    Alors seuls les produits correspondants sont renvoyés, les plus récents d'abord

  Scénario: Produit masqué
    Étant donné un produit avec "is_available" à false
    Quand je liste les produits disponibles de son producteur
    Alors il n'apparaît pas

  Scénario: Paramètres invalides
    Quand je filtre sur une catégorie inconnue
    Alors la réponse est 400
    Quand je demande un produit avec un identifiant qui n'est pas un UUID
    Alors la réponse est 400

Fonctionnalité: Gestion du catalogue par le producteur

  Scénario: Mon catalogue inclut les produits masqués
    Étant donné un producteur avec un produit masqué
    Quand il appelle GET /products/mine
    Alors le produit masqué est renvoyé

  Scénario: Seul le propriétaire modifie ou supprime
    Étant donné deux producteurs A et B
    Quand B modifie un produit de A
    Alors la réponse est 403
    Quand A modifie son produit
    Alors la réponse est 200 avec les nouvelles valeurs
    Quand A supprime son produit
    Alors la réponse est 204
    Et GET /products/{id} renvoie 404

  Scénario: Produit supprimé déjà commandé
    Étant donné une commande contenant le produit "Tomates"
    Quand le producteur supprime son compte ou le produit
    Alors la ligne de commande garde le nom "Tomates" et son product_id devient null
