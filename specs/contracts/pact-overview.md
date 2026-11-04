# Contrats d'intégration externes

TerraProxi dépend de trois services tiers. Il n'y a pas de Pact broker : chaque frontière est
décrite ci-dessous avec la façon dont elle est vérifiée.

| Service | Sens | Contrat utilisé | Vérification |
|---------|------|-----------------|--------------|
| Stripe | API → Stripe : création / lecture de PaymentIntent | `paymentIntents.create` (montant en centimes, EUR, `metadata.order_id`), `paymentIntents.retrieve` | Faux client injecté (`setStripeClient`) dans `apps/api/tests/integration/stripe-ai.test.ts` ; recette manuelle en mode test |
| Stripe | Stripe → API : webhook `POST /api/stripe/webhook` | Événement `payment_intent.succeeded`, en-tête `stripe-signature` vérifié sur le corps brut | Même test : signature valide / invalide, intent étranger ignoré ; en local `stripe listen --forward-to localhost:3002/api/stripe/webhook` |
| Google Gemini | API → Gemini : `generateContent` | Sortie JSON imposée par `responseSchema` ; la réponse est revalidée et filtrée sur le catalogue (`specs/schemas/ai-chat.schema.json`) | Recette manuelle (clé requise) ; 503 si la clé manque ou si la réponse est inexploitable |
| Base Adresse Nationale | Web → `api-adresse.data.gouv.fr/search` | `features[0].geometry.coordinates` = [lon, lat] | Recette manuelle de la fiche producteur (« Localiser l'adresse ») |

## Règles

- Un service tiers absent ne casse pas l'API : Stripe et Gemini non configurés → 503 sur leurs
  routes uniquement, le reste fonctionne.
- Aucune donnée personnelle n'est envoyée à Gemini (ni nom, ni email) ; seule l'adresse saisie
  part vers la Base Adresse Nationale.
- Les montants viennent toujours de la base, jamais du client.
