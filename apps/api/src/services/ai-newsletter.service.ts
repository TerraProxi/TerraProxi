/**
 * AI-4 — Brouillon de newsletter rédigé par Gemini à partir du catalogue et de
 * l'agenda du producteur. Le producteur relit et modifie avant d'envoyer
 * (POST /producers/me/newsletters) : rien n'est envoyé automatiquement.
 */
import { db } from '../db/client'
import { AppError } from '../utils/errors'
import { generateGeminiJson } from './gemini.service'

export type NewsletterTone = 'chaleureux' | 'informatif' | 'festif'

const MAX_PRODUCTS = 15
const MAX_EVENTS = 5
const MAX_SUBJECT = 200
const MAX_BODY = 2000

interface NewsletterDraft {
  subject: string
  body: string
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subject: { type: 'STRING', description: 'Objet court et accrocheur, 80 caractères maximum' },
    body: { type: 'STRING', description: 'Texte de la newsletter, 1200 caractères maximum, sans HTML' },
  },
  required: ['subject', 'body'],
}

async function loadNewsletterContext(producerId: string) {
  const [producer, products, events] = await Promise.all([
    db.query<{ company_name: string; city: string | null; description: string | null }>(
      'SELECT company_name, city, description FROM producers WHERE id = $1',
      [producerId],
    ),
    db.query<{ name: string; price: number; unit: string; stock: number }>(
      `SELECT name, price::float AS price, unit, stock FROM products
       WHERE producer_id = $1 AND is_available AND stock > 0
       ORDER BY updated_at DESC LIMIT $2`,
      [producerId, MAX_PRODUCTS],
    ),
    db.query<{ title: string; location: string | null; starts_at: Date }>(
      `SELECT title, location, starts_at FROM producer_events
       WHERE producer_id = $1 AND starts_at >= NOW() ORDER BY starts_at LIMIT $2`,
      [producerId, MAX_EVENTS],
    ),
  ])
  return { producer: producer.rows[0], products: products.rows, events: events.rows }
}

function buildInstruction(context: Awaited<ReturnType<typeof loadNewsletterContext>>, tone: NewsletterTone): string {
  const products = context.products.map((p) => `- ${p.name} : ${p.price.toFixed(2)} € / ${p.unit}`).join('\n')
  const events = context.events
    .map((e) => `- ${e.title}, le ${e.starts_at.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full' })}${e.location ? ` (${e.location})` : ''}`)
    .join('\n')
  return [
    `Tu rédiges la newsletter de « ${context.producer.company_name} »${context.producer.city ? `, producteur à ${context.producer.city}` : ''}, pour ses clients de la plateforme TerraProxi.`,
    `Ton : ${tone}. Langue : français. Tutoiement interdit. Pas de HTML ni de Markdown, des paragraphes courts.`,
    'N\'invente aucun produit, prix, date ni promotion : utilise seulement les informations ci-dessous.',
    'Termine en invitant à commander sur TerraProxi.',
    context.producer.description ? `Présentation de l'exploitation : ${context.producer.description}` : '',
    products ? `Produits disponibles :\n${products}` : 'Aucun produit en stock actuellement.',
    events ? `Prochains rendez-vous :\n${events}` : '',
  ].filter(Boolean).join('\n\n')
}

export async function draftNewsletter(producerId: string, tone: NewsletterTone, topic?: string): Promise<NewsletterDraft> {
  const context = await loadNewsletterContext(producerId)
  if (!context.producer) throw new AppError(404, 'Profil producteur introuvable')

  const draft = await generateGeminiJson<Partial<NewsletterDraft>>({
    systemInstruction: buildInstruction(context, tone),
    contents: [{
      role: 'user',
      parts: [{ text: topic?.trim() ? `Sujet souhaité : ${topic.trim()}` : 'Rédige la newsletter de la semaine.' }],
    }],
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.7,
    maxOutputTokens: 1024,
  })

  const subject = draft.subject?.trim()
  const body = draft.body?.trim()
  if (!subject || !body) throw new AppError(503, 'Réponse IA vide ou invalide')
  return { subject: subject.slice(0, MAX_SUBJECT), body: body.slice(0, MAX_BODY) }
}
