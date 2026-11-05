/**
 * PROD-6 — Agenda des producteurs : marchés, portes ouvertes, ventes à la ferme.
 * Lecture publique, écriture réservée au producteur propriétaire.
 */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { badRequest, forbidden, notFound } from '../utils/errors'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const DEFAULT_RADIUS_KM = 30

const EVENT_COLUMNS = `e.id, e.producer_id, pr.company_name AS producer_name, pr.city AS producer_city,
  e.title, e.description, e.location, e.starts_at, e.ends_at, e.created_at, e.updated_at`

const eventBody = t.Object({
  title:       t.String({ minLength: 1, maxLength: 200 }),
  description: t.Optional(t.String({ maxLength: 5000 })),
  location:    t.Optional(t.String({ maxLength: 500 })),
  starts_at:   t.String({ format: 'date-time' }),
  ends_at:     t.Optional(t.String({ format: 'date-time' })),
})

type EventBody = typeof eventBody.static

function assertValidDates(body: EventBody): void {
  if (body.ends_at && new Date(body.ends_at) <= new Date(body.starts_at)) {
    throw badRequest('La fin doit être postérieure au début')
  }
}

async function findOwnProducerId(userId: string): Promise<string> {
  const res = await db.query<{ id: string }>('SELECT id FROM producers WHERE user_id = $1', [userId])
  if (!res.rows[0]) throw notFound('Profil producteur')
  return res.rows[0].id
}

async function assertEventOwner(eventId: string, userId: string): Promise<void> {
  const res = await db.query<{ user_id: string }>(
    'SELECT pr.user_id FROM producer_events e JOIN producers pr ON pr.id = e.producer_id WHERE e.id = $1',
    [eventId],
  )
  if (!res.rows[0]) throw notFound('Événement')
  if (res.rows[0].user_id !== userId) throw forbidden()
}

async function loadEvent(eventId: string) {
  const res = await db.query(
    `SELECT ${EVENT_COLUMNS} FROM producer_events e JOIN producers pr ON pr.id = e.producer_id WHERE e.id = $1`,
    [eventId],
  )
  return res.rows[0]
}

export const eventsRoutes = new Elysia({ prefix: '/events' })

  /**
   * GET /api/events — agenda public : événements à venir (ou en cours), triés par date.
   * Filtres : producteur, ou proximité (lat/lon/radius en km).
   */
  .get(
    '/',
    async ({ query }) => {
      if ((query.lat === undefined) !== (query.lon === undefined)) {
        throw badRequest('lat et lon doivent être fournis ensemble')
      }
      const params: unknown[] = []
      const where: string[] = []
      if (!query.include_past) where.push('COALESCE(e.ends_at, e.starts_at) >= NOW()')
      if (query.producer_id) {
        params.push(query.producer_id)
        where.push(`e.producer_id = $${params.length}`)
      }
      if (query.lat !== undefined && query.lon !== undefined) {
        params.push(query.lon, query.lat, (query.radius ?? DEFAULT_RADIUS_KM) * 1000)
        const n = params.length
        where.push(`ST_DWithin(pr.location::geography,
          ST_SetSRID(ST_MakePoint($${n - 2}, $${n - 1}), 4326)::geography, $${n})`)
      }
      params.push(Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT), query.offset ?? 0)

      const result = await db.query(
        `SELECT ${EVENT_COLUMNS}
         FROM producer_events e JOIN producers pr ON pr.id = e.producer_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY e.starts_at ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        producer_id:  t.Optional(t.String({ format: 'uuid' })),
        lat:          t.Optional(t.Number({ minimum: -90, maximum: 90 })),
        lon:          t.Optional(t.Number({ minimum: -180, maximum: 180 })),
        radius:       t.Optional(t.Number({ minimum: 0.1, maximum: 500 })),
        include_past: t.Optional(t.BooleanString()),
        limit:        t.Optional(t.Integer({ minimum: 1 })),
        offset:       t.Optional(t.Integer({ minimum: 0 })),
      }),
      detail: { summary: 'Agenda des producteurs', tags: ['Events'] },
    },
  )

  .use(authGuard(['PRODUCER']))

  /** GET /api/events/mine — tout l'agenda du producteur connecté, passé compris. */
  .get(
    '/mine',
    async ({ user }) => {
      const producerId = await findOwnProducerId(user.sub)
      const result = await db.query(
        `SELECT ${EVENT_COLUMNS} FROM producer_events e JOIN producers pr ON pr.id = e.producer_id
         WHERE e.producer_id = $1 ORDER BY e.starts_at DESC`,
        [producerId],
      )
      return result.rows
    },
    { detail: { summary: 'Mon agenda', tags: ['Events'] } },
  )

  .post(
    '/',
    async ({ body, user, set }) => {
      assertValidDates(body)
      const producerId = await findOwnProducerId(user.sub)
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO producer_events (producer_id, title, description, location, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [producerId, body.title.trim(), body.description?.trim() || null, body.location?.trim() || null,
          body.starts_at, body.ends_at ?? null],
      )
      set.status = 201
      return loadEvent(inserted.rows[0].id)
    },
    { body: eventBody, detail: { summary: 'Ajouter un événement', tags: ['Events'] } },
  )

  .put(
    '/:id',
    async ({ params, body, user }) => {
      assertValidDates(body)
      await assertEventOwner(params.id, user.sub)
      await db.query(
        `UPDATE producer_events SET title = $1, description = $2, location = $3, starts_at = $4, ends_at = $5
         WHERE id = $6`,
        [body.title.trim(), body.description?.trim() || null, body.location?.trim() || null,
          body.starts_at, body.ends_at ?? null, params.id],
      )
      return loadEvent(params.id)
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: eventBody,
      detail: { summary: 'Modifier un événement', tags: ['Events'] },
    },
  )

  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await assertEventOwner(params.id, user.sub)
      await db.query('DELETE FROM producer_events WHERE id = $1', [params.id])
      set.status = 204
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Supprimer un événement', tags: ['Events'] },
    },
  )
