/**
 * EPIC 11 — Extensions IA (post-MVP)
 *
 * Ces endpoints ne sont actifs qu'une fois les données historiques disponibles
 * (au minimum 3 mois de commandes). Implémenter les modèles ML séparément dans
 * un micro-service Python/FastAPI ou via une API externe (OpenAI, Hugging Face…)
 * et brancher ici.
 */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authGuard())

  /**
   * GET /api/ai/recommendations
   * Retourne des produits recommandés pour le consommateur courant
   * basés sur son historique de commandes.
   * Implémentation stub — à brancher sur un modèle ML réel.
   */
  .get(
    '/recommendations',
    async ({ user }) => {
      // Récupération des produits les plus commandés par des consommateurs
      // ayant un profil similaire (collaborative filtering simplifié).
      const result = await db.query(
        `SELECT p.*, COUNT(oi.id) AS order_count
         FROM products p
         JOIN order_items oi ON oi.product_id = p.id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'COMPLETED'
           AND p.is_available = true
           AND p.id NOT IN (
             SELECT DISTINCT oi2.product_id
             FROM order_items oi2
             JOIN orders o2 ON o2.id = oi2.order_id
             WHERE o2.consumer_id = $1
           )
         GROUP BY p.id
         ORDER BY order_count DESC
         LIMIT 10`,
        [user.sub],
      )
      return result.rows
    },
    { detail: { summary: 'Recommandations produits', tags: ['AI'] } },
  )

  /**
   * GET /api/ai/forecast/:producerId
   * Prévision de la demande pour les produits d'un producteur.
   * Implémentation stub — retourne les moyennes historiques par produit.
   */
  .get(
    '/forecast/:producerId',
    async ({ params }) => {
      const result = await db.query(
        `SELECT
           p.id, p.name,
           AVG(oi.quantity) AS avg_weekly_qty,
           COUNT(DISTINCT o.id) AS total_orders,
           MAX(o.created_at) AS last_order_at
         FROM products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'COMPLETED'
         WHERE p.producer_id = $1
         GROUP BY p.id, p.name
         ORDER BY total_orders DESC`,
        [params.producerId],
      )
      return result.rows.map((r) => ({
        ...r,
        forecast_next_week: Math.round(Number(r.avg_weekly_qty ?? 0)),
        confidence: r.total_orders >= 10 ? 'HIGH' : r.total_orders >= 3 ? 'MEDIUM' : 'LOW',
      }))
    },
    { detail: { summary: 'Prévision de la demande', tags: ['AI'] } },
  )
