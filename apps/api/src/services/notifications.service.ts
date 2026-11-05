import { db } from '../db/client'
import { log } from '../utils/logger'

/**
 * Notifications in-app (EPIC 7) et push mobile via Expo (NOTIF-4).
 *
 * Une notification ne doit jamais faire échouer l'action qui la déclenche :
 * `notify` journalise les erreurs au lieu de les propager. Elle est appelée
 * après la validation de la transaction métier.
 */
export type NotificationType =
  | 'NEW_ORDER' | 'ORDER_STATUS' | 'PAYMENT' | 'NEW_MESSAGE' | 'NEWSLETTER' | 'ACCOUNT'

export type NotificationTarget = 'ORDER' | 'CONVERSATION' | 'PRODUCER'

export interface NotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  targetType?: NotificationTarget
  targetId?: string
}

export interface PushMessage {
  to: string
  title: string
  body: string
  sound: 'default'
  data: { type: NotificationType; target_type: NotificationTarget | null; target_id: string | null }
}

export const EXPO_PUSH_TOKEN_PATTERN = '^Expo(nent)?PushToken\\[[^\\]]+\\]$'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_BATCH_SIZE = 100
const PUSH_TIMEOUT_MS = 10_000
const MAX_TITLE = 200
const MAX_BODY = 2000

type PushSender = (messages: PushMessage[]) => Promise<void>

interface ExpoTicket {
  status: 'ok' | 'error'
  details?: { error?: string }
}

/** Envoie les messages à Expo ; un appareil désinscrit voit son jeton effacé. */
async function sendWithExpo(messages: PushMessage[]): Promise<void> {
  if (process.env.NODE_ENV === 'test' || process.env.PUSH_NOTIFICATIONS_ENABLED === 'false') return

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE)
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    })
    if (!response.ok) {
      log.warn('expo push rejected', { status: response.status })
      continue
    }
    const { data } = await response.json() as { data?: ExpoTicket[] }
    const unregistered = batch.filter((_, index) => data?.[index]?.details?.error === 'DeviceNotRegistered')
    if (unregistered.length) {
      await db.query('UPDATE users SET push_token = NULL WHERE push_token = ANY($1::text[])', [
        unregistered.map((m) => m.to),
      ])
    }
  }
}

let pushSender: PushSender = sendWithExpo

/** Permet aux tests de capturer les push au lieu de les envoyer. */
export function setPushSender(sender: PushSender | null): void {
  pushSender = sender ?? sendWithExpo
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

export async function notify(input: NotificationInput | NotificationInput[]): Promise<void> {
  const inputs = (Array.isArray(input) ? input : [input]).filter((n) => n.userId)
  if (!inputs.length) return

  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, target_type, target_id)
       SELECT * FROM unnest($1::uuid[], $2::notification_type[], $3::text[], $4::text[], $5::text[], $6::uuid[])`,
      [
        inputs.map((n) => n.userId),
        inputs.map((n) => n.type),
        inputs.map((n) => truncate(n.title, MAX_TITLE)),
        inputs.map((n) => truncate(n.body, MAX_BODY)),
        inputs.map((n) => n.targetType ?? null),
        inputs.map((n) => n.targetId ?? null),
      ],
    )
    await pushToDevices(inputs)
  } catch (err) {
    log.error('notification failed', { err, count: inputs.length })
  }
}

async function pushToDevices(inputs: NotificationInput[]): Promise<void> {
  const tokens = await db.query<{ id: string; push_token: string }>(
    `SELECT id, push_token FROM users
     WHERE id = ANY($1::uuid[]) AND push_token IS NOT NULL AND is_active`,
    [[...new Set(inputs.map((n) => n.userId))]],
  )
  if (!tokens.rows.length) return
  const tokenByUser = new Map(tokens.rows.map((r) => [r.id, r.push_token]))

  const messages: PushMessage[] = inputs
    .filter((n) => tokenByUser.has(n.userId))
    .map((n) => ({
      to: tokenByUser.get(n.userId)!,
      title: truncate(n.title, MAX_TITLE),
      body: truncate(n.body, 180),
      sound: 'default',
      data: { type: n.type, target_type: n.targetType ?? null, target_id: n.targetId ?? null },
    }))
  await pushSender(messages)
}

export const formatEuros = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
