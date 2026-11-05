# Contrats d'intégration externes

TerraProxi dépend de quatre services tiers. Il n'y a pas de Pact broker : chaque frontière est
décrite ci-dessous avec la façon dont elle est vérifiée.

| Service | Sens | Contrat utilisé | Vérification |
|---------|------|-----------------|--------------|
| Stripe | API → Stripe : création / lecture de PaymentIntent | `paymentIntents.create` (montant en centimes, EUR, `metadata.order_id`), `paymentIntents.retrieve` | Faux client injecté (`setStripeClient`) dans `apps/api/tests/integration/stripe-ai.test.ts` ; recette manuelle en mode test |
| Stripe | Stripe → API : webhook `POST /api/stripe/webhook` | Événement `payment_intent.succeeded`, en-tête `stripe-signature` vérifié sur le corps brut | Même test : signature valide / invalide, intent étranger ignoré ; en local `stripe listen --forward-to localhost:3002/api/stripe/webhook` |
| Stripe | API → Stripe : annulation et remboursement | `paymentIntents.cancel`, `refunds.create` (clé d'idempotence `refund-{orderId}`) | Faux client dans `apps/api/tests/integration/payments.test.ts` (annulation, remboursement, 502) |
| Google Gemini | API → Gemini : `generateContent` | Sortie JSON imposée par `responseSchema` ; la réponse est revalidée et filtrée sur le catalogue (`specs/schemas/ai-chat.schema.json`) | Faux transport (`setGeminiFetch`) pour la newsletter dans `producer-tools.test.ts` ; recette manuelle de l'assistant ; 503 si la clé manque ou si la réponse est inexploitable |
| Expo Push | API → `exp.host/--/api/v2/push/send` | Lots de 100 messages `{to, title, body, data}` ; ticket `DeviceNotRegistered` → jeton effacé | Faux émetteur (`setPushSender`) dans `notifications.test.ts` ; recette sur un téléphone (build EAS) |
| Base Adresse Nationale | Web → `api-adresse.data.gouv.fr/search` | `features[0].geometry.coordinates` = [lon, lat] | Recette manuelle de la fiche producteur (« Localiser l'adresse ») |

## Règles

- Un service tiers absent ne casse pas l'API : Stripe et Gemini non configurés → 503 sur leurs
  routes uniquement, le reste fonctionne ; Expo Push indisponible → notification in-app seulement.
- Délais bornés : Gemini 25 s, Expo Push 10 s. La clé Gemini part dans l'en-tête
  `x-goog-api-key`, jamais dans l'URL.
- Aucune donnée personnelle n'est envoyée à Gemini (ni nom, ni email) ; seule l'adresse saisie
  part vers la Base Adresse Nationale ; Expo Push reçoit le titre et l'aperçu de la notification.
- Les montants viennent toujours de la base, jamais du client.
