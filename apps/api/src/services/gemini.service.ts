import { AppError } from '../utils/errors'
import type { CatalogProducer } from './ai-catalog.service'
import { buildSystemInstruction } from './ai-system-prompt'
import type { CartContext } from './ai-cart.service'
import {
  sanitizeCartActions,
  sanitizeQuickReplies,
  type AiCartActionInput,
  type SanitizedCartAction,
} from './ai-cart.service'

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ProducerLink {
  producer_id: string
  company_name: string
  reason: string
  city?: string
}

export interface AiChatResult {
  reply: string
  producer_links: ProducerLink[]
  cart_actions: SanitizedCartAction[]
  quick_replies: string[]
}

interface GeminiChatOptions {
  isExpandedRadius?: boolean
  cart?: CartContext | null
}

interface RawAiChatResult {
  reply?: string
  producer_links?: ProducerLink[]
  cart_actions?: AiCartActionInput[]
  quick_replies?: string[]
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new AppError(
      503,
      'Assistant IA indisponible : GEMINI_API_KEY non configurée',
    )
  }
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'
  return { apiKey, model }
}

function buildResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      reply: {
        type: 'STRING',
        description: 'Réponse conversationnelle pour l\'utilisateur',
      },
      producer_links: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            producer_id: { type: 'STRING' },
            company_name: { type: 'STRING' },
            reason: { type: 'STRING' },
            city: { type: 'STRING' },
          },
          required: ['producer_id', 'company_name', 'reason'],
        },
      },
      cart_actions: {
        type: 'ARRAY',
        description: 'Actions panier à exécuter côté application',
        items: {
          type: 'OBJECT',
          properties: {
            type: {
              type: 'STRING',
              enum: [
                'add_to_cart',
                'remove_from_cart',
                'update_cart_quantity',
                'clear_cart',
              ],
            },
            product_id: { type: 'STRING' },
            quantity: { type: 'NUMBER' },
          },
          required: ['type'],
        },
      },
      quick_replies: {
        type: 'ARRAY',
        description: 'Réponses rapides suggérées (quantité, confirmation, etc.)',
        items: { type: 'STRING' },
      },
    },
    required: ['reply', 'producer_links', 'cart_actions', 'quick_replies'],
  }
}

function buildContents(
  message: string,
  history: ChatHistoryItem[],
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents = history.slice(-10).map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.content }],
  }))
  contents.push({ role: 'user', parts: [{ text: message }] })
  return contents
}

function sanitizeProducerLinks(
  links: ProducerLink[],
  catalog: CatalogProducer[],
): ProducerLink[] {
  const catalogById = new Map(catalog.map((p) => [p.id, p]))

  return links
    .filter((link) => catalogById.has(link.producer_id))
    .slice(0, 5)
    .map((link) => {
      const producer = catalogById.get(link.producer_id)!
      return {
        producer_id: link.producer_id,
        company_name: producer.company_name,
        reason: link.reason?.trim() || 'Recommandé par TerraProxi',
        city: producer.city || link.city,
      }
    })
}

export async function chatWithGemini(
  message: string,
  history: ChatHistoryItem[],
  catalog: CatalogProducer[],
  options?: GeminiChatOptions,
): Promise<AiChatResult> {
  const { apiKey, model } = getGeminiConfig()
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: buildSystemInstruction(catalog, {
            isExpandedRadius: options?.isExpandedRadius,
            cart: options?.cart,
          }),
        }],
      },
      contents: buildContents(message, history),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: buildResponseSchema(),
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[Gemini]', response.status, errorBody)
    throw new AppError(503, 'Le service IA est temporairement indisponible')
  }

  const payload = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }

  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    throw new AppError(503, 'Réponse IA vide ou invalide')
  }

  let parsed: RawAiChatResult
  try {
    parsed = JSON.parse(rawText) as RawAiChatResult
  } catch {
    throw new AppError(503, 'Réponse IA mal formée')
  }

  return {
    reply: parsed.reply?.trim() || 'Je n\'ai pas pu formuler une réponse.',
    producer_links: sanitizeProducerLinks(parsed.producer_links ?? [], catalog),
    cart_actions: sanitizeCartActions(parsed.cart_actions, catalog),
    quick_replies: sanitizeQuickReplies(parsed.quick_replies),
  }
}
