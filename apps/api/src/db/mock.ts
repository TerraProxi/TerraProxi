import bcrypt from 'bcryptjs'
import {
  seedProducers,
  seedProducts,
  seedUsers,
  seedMessages,
  type SeedProducer,
  type SeedProduct,
  type SeedUser,
  type SeedMessage,
} from './seed'

let dbAvailable: boolean | null = null

export function setDbAvailable(val: boolean) {
  dbAvailable = val
}

export function isDbAvailable() {
  return dbAvailable
}

const MOCK_PASSWORD_HASH = bcrypt.hashSync('password', 4)

let users: SeedUser[] = seedUsers.map(u => ({ ...u, password_hash: MOCK_PASSWORD_HASH }))
let producers: SeedProducer[] = seedProducers.map(p => ({ ...p }))
let products: SeedProduct[] = seedProducts.map(p => ({ ...p }))
let messages: SeedMessage[] = seedMessages.map(m => ({ ...m }))
let orders: Record<string, unknown>[] = []
let orderItems: Record<string, unknown>[] = []

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function extractParam(sql: string, pattern: RegExp, params: unknown[]): unknown | undefined {
  const match = sql.match(pattern)
  if (!match) return undefined
  const idx = parseInt(match[1], 10) - 1
  return params[idx]
}

function extractLimitOffset(sql: string, params: unknown[]): { limit: number; offset: number } {
  let limit = 20
  let offset = 0

  const limitParamMatch = sql.match(/LIMIT\s+\$(\d+)/i)
  if (limitParamMatch) {
    const idx = parseInt(limitParamMatch[1], 10) - 1
    if (idx < params.length && typeof params[idx] === 'number') {
      limit = params[idx] as number
    }
  } else {
    const limitLiteralMatch = sql.match(/LIMIT\s+(\d+)/i)
    if (limitLiteralMatch) limit = parseInt(limitLiteralMatch[1], 10)
  }

  const offsetParamMatch = sql.match(/OFFSET\s+\$(\d+)/i)
  if (offsetParamMatch) {
    const idx = parseInt(offsetParamMatch[1], 10) - 1
    if (idx < params.length && typeof params[idx] === 'number') {
      offset = params[idx] as number
    }
  } else {
    const offsetLiteralMatch = sql.match(/OFFSET\s+(\d+)/i)
    if (offsetLiteralMatch) offset = parseInt(offsetLiteralMatch[1], 10)
  }

  return { limit, offset }
}

function producerToRow(p: SeedProducer, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: p.id,
    user_id: p.user_id,
    company_name: p.company_name,
    description: p.description,
    address: p.address,
    city: p.city,
    postal_code: p.postal_code,
    latitude: p.latitude,
    longitude: p.longitude,
    website_url: p.website_url,
    banner_url: p.banner_url,
    is_verified: p.is_verified,
    created_at: p.created_at,
    first_name: p.first_name,
    last_name: p.last_name,
    rating: p.rating,
    review_count: p.review_count,
    categories: p.categories,
    is_open: p.is_open,
    distance_km: p.distance_km,
    ...extra,
  }
}

function productToRow(p: SeedProduct, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: p.id,
    producer_id: p.producer_id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    category: p.category,
    image_url: p.image_url,
    is_available: p.is_available,
    created_at: p.created_at,
    producer_name: p.producer_name,
    is_bestseller: p.is_bestseller,
    is_seasonal: p.is_seasonal,
    ...extra,
  }
}

async function handleProducerQuery(sql: string, params: unknown[]) {
  const p = params

  if (sql.includes('INSERT INTO producers')) {
    const newId = `prod-${String(producers.length + 1).padStart(3, '0')}`
    const newProducer: SeedProducer = {
      id: newId,
      user_id: p[0] as string,
      company_name: p[1] as string,
      description: p[2] as string,
      address: p[3] as string,
      city: p[4] as string,
      postal_code: p[5] as string,
      latitude: undefined,
      longitude: undefined,
      website_url: p[8] as string,
      is_verified: false,
      created_at: new Date().toISOString(),
    }
    producers.push(newProducer)

    if (sql.includes('RETURNING')) {
      const row = producerToRow(newProducer)
      const returningMatch = sql.match(/RETURNING\s+(.+)/is)
      if (returningMatch) {
        const fields = returningMatch[1].split(',').map(f => f.trim())
        const filtered: Record<string, unknown> = {}
        for (const f of fields) {
          const key = f.replace(/.*AS\s+(\w+)/i, '$1').trim()
          if (key in row) filtered[key] = row[key]
        }
        return { rows: [filtered], rowCount: 1 }
      }
    }
    return { rows: [producerToRow(newProducer)], rowCount: 1 }
  }

  if (sql.includes('UPDATE producers SET')) {
    const userIdMatch = sql.match(/WHERE\s+user_id\s*=\s*\$(\d+)/i)
    if (userIdMatch) {
      const idx = parseInt(userIdMatch[1], 10) - 1
      const userId = p[idx] as string
      const producerIdx = producers.findIndex(pr => pr.user_id === userId)
      if (producerIdx >= 0) {
        const pr = producers[producerIdx]
        if (p[1] !== null && p[1] !== undefined) pr.company_name = p[1] as string
        if (p[2] !== null && p[2] !== undefined) pr.description = p[2] as string
        if (p[3] !== null && p[3] !== undefined) pr.address = p[3] as string
        if (p[4] !== null && p[4] !== undefined) pr.city = p[4] as string
        if (p[5] !== null && p[5] !== undefined) pr.postal_code = p[5] as string
        producers[producerIdx] = pr

        if (sql.includes('RETURNING')) {
          const row = producerToRow(pr)
          const returningMatch = sql.match(/RETURNING\s+(.+)/is)
          if (returningMatch) {
            const fields = returningMatch[1].split(',').map(f => f.trim())
            const filtered: Record<string, unknown> = {}
            for (const f of fields) {
              const key = f.replace(/.*AS\s+(\w+)/i, '$1').trim()
              if (key in row) filtered[key] = row[key]
            }
            return { rows: [filtered], rowCount: 1 }
          }
        }
        return { rows: [producerToRow(pr)], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE user_id') && !sql.includes('JOIN users')) {
    const userIdParam = extractParam(sql, /user_id\s*=\s*\$(\d+)/i, p)
    if (userIdParam) {
      const found = producers.find(pr => pr.user_id === userIdParam)
      if (found) {
        if (sql.includes('SELECT id')) {
          return { rows: [{ id: found.id }], rowCount: 1 }
        }
        return { rows: [producerToRow(found)], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if ((sql.includes('WHERE p.id =') || sql.includes('WHERE id =')) && sql.includes('FROM producers')) {
    const idParam = extractParam(sql, /(?:p\.)?id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const found = producers.find(pr => pr.id === idParam)
      if (found) {
        const user = users.find(u => u.id === found.user_id)
        return {
          rows: [producerToRow(found, {
            email: user?.email,
          })],
          rowCount: 1,
        }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('ST_DWithin') || sql.includes('ST_Distance')) {
    const lat = p[0] as number
    const lon = p[1] as number
    const radius = (p[2] as number) ?? 30
    const searchVal = sql.includes('ILIKE') ? (p[4] as string | undefined) : undefined

    let results = producers
      .filter(pr => pr.latitude != null && pr.longitude != null)
      .map(pr => {
        const dist = haversineDistance(lat, lon, pr.latitude!, pr.longitude!)
        return { ...pr, distance_km: Math.round(dist * 10) / 10 }
      })
      .filter(pr => pr.distance_km! <= radius)

    if (searchVal) {
      const term = searchVal.replace(/%/g, '').toLowerCase()
      results = results.filter(pr =>
        pr.company_name.toLowerCase().includes(term) ||
        (pr.description && pr.description.toLowerCase().includes(term))
      )
    }

    results.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))

    const { limit, offset } = extractLimitOffset(sql, p)
    results = results.slice(offset, offset + limit)

    return {
      rows: results.map(pr => producerToRow(pr)),
      rowCount: results.length,
    }
  }

  let results = [...producers]

  if (sql.includes('ILIKE')) {
    const searchParam = extractParam(sql, /ILIKE\s+\$(\d+)/i, p)
    if (searchParam) {
      const term = String(searchParam).replace(/%/g, '').toLowerCase()
      results = results.filter(pr =>
        pr.company_name.toLowerCase().includes(term) ||
        (pr.description && pr.description.toLowerCase().includes(term))
      )
    }
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const { limit, offset } = extractLimitOffset(sql, p)
  results = results.slice(offset, offset + limit)

  return {
    rows: results.map(pr => producerToRow(pr)),
    rowCount: results.length,
  }
}

async function handleProductQuery(sql: string, params: unknown[]) {
  const p = params

  if (sql.includes('DELETE FROM products')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = products.findIndex(pr => pr.id === idParam)
      if (idx >= 0) products.splice(idx, 1)
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('INSERT INTO products')) {
    const newId = `sku-${String(products.length + 1).padStart(3, '0')}`
    const newProduct: SeedProduct = {
      id: newId,
      producer_id: p[0] as string,
      name: p[1] as string,
      description: p[2] as string ?? undefined,
      price: Number(p[3]),
      stock: p[4] as number,
      unit: (p[5] as string) ?? 'unité',
      category: ((p[6] as string) ?? 'OTHER') as SeedProduct['category'],
      image_url: p[7] as string ?? undefined,
      is_available: p[8] as boolean ?? true,
      created_at: new Date().toISOString(),
      producer_name: producers.find(pr => pr.id === p[0])?.company_name,
    }
    products.push(newProduct)

    if (sql.includes('RETURNING *')) {
      return { rows: [productToRow(newProduct)], rowCount: 1 }
    }
    return { rows: [newProduct], rowCount: 1 }
  }

  if (sql.includes('UPDATE products SET')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = products.findIndex(pr => pr.id === idParam)
      if (idx >= 0) {
        const pr = products[idx]
        if (p[0] != null) pr.name = p[0] as string
        if (p[1] != null) pr.description = p[1] as string
        if (p[2] != null) pr.price = Number(p[2])
        if (p[3] != null) pr.stock = p[3] as number
        if (p[4] != null) pr.unit = p[4] as string
        if (p[5] != null) pr.category = p[5] as SeedProduct['category']
        if (p[6] != null) pr.image_url = p[6] as string
        if (p[7] != null) pr.is_available = p[7] as boolean
        products[idx] = pr

        if (sql.includes('RETURNING *')) {
          return { rows: [productToRow(pr)], rowCount: 1 }
        }
        return { rows: [productToRow(pr)], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('UPDATE products SET stock = stock')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = products.findIndex(pr => pr.id === idParam)
      if (idx >= 0) {
        const qty = p[0] as number
        products[idx].stock = Math.max(0, products[idx].stock - qty)
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE p.id =') || (sql.includes('WHERE id =') && sql.includes('FROM products'))) {
    const idParam = extractParam(sql, /(?:p\.)?id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const found = products.find(pr => pr.id === idParam)
      if (found) {
        const producer = producers.find(pr => pr.id === found.producer_id)
        const extra: Record<string, unknown> = {}

        if (producer) {
          extra.producer_name = producer.company_name
          extra.producer_city = producer.city
        }

        if (sql.includes('pr.user_id')) {
          extra.user_id = producer?.user_id
        }

        if (sql.includes('AND producer_id =') && sql.includes('AND is_available')) {
          const producerIdParam = extractParam(sql, /producer_id\s*=\s*\$(\d+)/i, p)
          const availableParam = extractParam(sql, /is_available\s*=\s*\$(\d+)/i, p)
          if (producerIdParam && found.producer_id !== producerIdParam) {
            return { rows: [], rowCount: 0 }
          }
          if (availableParam !== undefined && found.is_available !== availableParam) {
            return { rows: [], rowCount: 0 }
          }
        }

        if (sql.includes('pr.user_id') && !sql.includes('p.*')) {
          return { rows: [{ user_id: producer?.user_id }], rowCount: 1 }
        }

        return { rows: [productToRow(found, extra)], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  let results = [...products]

  const producerIdParam = extractParam(sql, /p\.producer_id\s*=\s*\$(\d+)/i, p)
  if (producerIdParam) {
    results = results.filter(pr => pr.producer_id === producerIdParam)
  }

  const categoryParam = extractParam(sql, /p\.category\s*=\s*\$(\d+)/i, p)
  if (categoryParam) {
    results = results.filter(pr => pr.category === categoryParam)
  }

  const availableParam = extractParam(sql, /p\.is_available\s*=\s*\$(\d+)/i, p)
  if (availableParam !== undefined) {
    results = results.filter(pr => pr.is_available === availableParam)
  }

  if (sql.includes('ILIKE')) {
    const searchParam = extractParam(sql, /ILIKE\s+\$(\d+)/i, p)
    if (searchParam) {
      const term = String(searchParam).replace(/%/g, '').toLowerCase()
      results = results.filter(pr =>
        pr.name.toLowerCase().includes(term) ||
        (pr.description && pr.description.toLowerCase().includes(term))
      )
    }
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const { limit, offset } = extractLimitOffset(sql, p)
  results = results.slice(offset, offset + limit)

  return {
    rows: results.map(pr => productToRow(pr)),
    rowCount: results.length,
  }
}

async function handleUserQuery(sql: string, params: unknown[]) {
  const p = params

  if (sql.includes('DELETE FROM users')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = users.findIndex(u => u.id === idParam)
      if (idx >= 0) users.splice(idx, 1)
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('INSERT INTO users')) {
    const newId = `user-${Date.now()}`
    const newUser: SeedUser = {
      id: newId,
      email: p[0] as string,
      password_hash: p[1] as string,
      first_name: p[2] as string,
      last_name: p[3] as string,
      role: (p[4] as 'CONSUMER' | 'PRODUCER' | 'ADMIN') ?? 'CONSUMER',
      is_active: true,
      gdpr_consent: p[5] as boolean,
      gdpr_consent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    users.push(newUser)

    const row: Record<string, unknown> = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: newUser.role,
      created_at: newUser.created_at,
    }

    if (sql.includes('RETURNING')) {
      const returningMatch = sql.match(/RETURNING\s+(.+)/is)
      if (returningMatch) {
        const fields = returningMatch[1].split(',').map(f => f.trim())
        const filtered: Record<string, unknown> = {}
        for (const f of fields) {
          const key = f.replace(/.*AS\s+(\w+)/i, '$1').trim()
          if (key in row) filtered[key] = row[key]
        }
        return { rows: [filtered], rowCount: 1 }
      }
    }
    return { rows: [row], rowCount: 1 }
  }

  if (sql.includes('UPDATE users SET')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = users.findIndex(u => u.id === idParam)
      if (idx >= 0) {
        const u = users[idx]
        if (p[0] != null) u.first_name = p[0] as string
        if (p[1] != null) u.last_name = p[1] as string
        if (p[2] != null) u.phone = p[2] as string
        if (p[3] != null) u.avatar_url = p[3] as string
        users[idx] = u

        const row: Record<string, unknown> = {
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          phone: u.phone,
          avatar_url: u.avatar_url,
        }

        if (sql.includes('RETURNING')) {
          const returningMatch = sql.match(/RETURNING\s+(.+)/is)
          if (returningMatch) {
            const fields = returningMatch[1].split(',').map(f => f.trim())
            const filtered: Record<string, unknown> = {}
            for (const f of fields) {
              const key = f.replace(/.*AS\s+(\w+)/i, '$1').trim()
              if (key in row) filtered[key] = row[key]
            }
            return { rows: [filtered], rowCount: 1 }
          }
        }
        return { rows: [row], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE email')) {
    const emailParam = extractParam(sql, /email\s*=\s*\$(\d+)/i, p)
    if (emailParam) {
      const found = users.find(u => u.email === emailParam)
      if (found) {
        if (sql.includes('password_hash')) {
          return {
            rows: [{
              id: found.id,
              email: found.email,
              password_hash: found.password_hash,
              first_name: found.first_name,
              last_name: found.last_name,
              role: found.role,
              is_active: found.is_active,
            }],
            rowCount: 1,
          }
        }
        return { rows: [{ id: found.id }], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE id')) {
    const idParam = extractParam(sql, /id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const found = users.find(u => u.id === idParam)
      if (found) {
        return {
          rows: [{
            id: found.id,
            email: found.email,
            first_name: found.first_name,
            last_name: found.last_name,
            role: found.role,
            phone: found.phone,
            avatar_url: found.avatar_url,
            created_at: found.created_at,
          }],
          rowCount: 1,
        }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  return { rows: [], rowCount: 0 }
}

async function handleMessageQuery(sql: string, params: unknown[]) {
  const p = params

  if (sql.includes('UPDATE messages')) {
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('INSERT INTO messages')) {
    const newMsg: SeedMessage = {
      id: `msg-${Date.now()}`,
      sender_id: p[0] as string,
      receiver_id: p[1] as string,
      content: p[2] as string,
      is_read: false,
      sent_at: new Date().toISOString(),
    }
    const sender = users.find(u => u.id === newMsg.sender_id)
    if (sender) {
      newMsg.first_name = sender.first_name
      newMsg.last_name = sender.last_name
    }
    messages.push(newMsg)

    if (sql.includes('RETURNING *')) {
      return {
        rows: [{
          id: newMsg.id,
          sender_id: newMsg.sender_id,
          receiver_id: newMsg.receiver_id,
          content: newMsg.content,
          is_read: newMsg.is_read,
          sent_at: newMsg.sent_at,
        }],
        rowCount: 1,
      }
    }
    return { rows: [newMsg], rowCount: 1 }
  }

  if (sql.includes('DISTINCT ON') || sql.includes('partner_id')) {
    const userId = p[0] as string
    const conversations: Record<string, unknown>[] = []
    const seenPartners = new Set<string>()

    for (const m of messages) {
      const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id
      if (m.sender_id !== userId && m.receiver_id !== userId) continue
      if (seenPartners.has(partnerId)) continue
      seenPartners.add(partnerId)

      const partner = users.find(u => u.id === partnerId)
      const unreadCount = messages.filter(
        msg => msg.sender_id === partnerId && msg.receiver_id === userId && !msg.is_read
      ).length

      conversations.push({
        partner_id: partnerId,
        partner_name: partner ? `${partner.first_name} ${partner.last_name}` : 'Inconnu',
        last_content: m.content,
        last_sent_at: m.sent_at,
        unread_count: unreadCount,
      })
    }

    return { rows: conversations, rowCount: conversations.length }
  }

  if (sql.includes('WHERE (m.sender_id')) {
    const userId = p[0] as string
    const partnerId = p[1] as string
    const limit = (p[2] as number) ?? 50

    const conversation = messages
      .filter(m =>
        (m.sender_id === userId && m.receiver_id === partnerId) ||
        (m.sender_id === partnerId && m.receiver_id === userId)
      )
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
      .slice(0, limit)
      .map(m => {
        const sender = users.find(u => u.id === m.sender_id)
        return {
          id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          content: m.content,
          is_read: m.is_read,
          sent_at: m.sent_at,
          first_name: sender?.first_name ?? m.first_name,
          last_name: sender?.last_name ?? m.last_name,
        }
      })

    return { rows: conversation, rowCount: conversation.length }
  }

  return { rows: [], rowCount: 0 }
}

async function handleOrderQuery(sql: string, params: unknown[]) {
  const p = params

  if (sql.includes('INSERT INTO orders')) {
    const newId = `order-${Date.now()}`
    const newOrder = {
      id: newId,
      consumer_id: p[0] as string,
      producer_id: p[1] as string,
      total_price: p[2] as string,
      notes: p[3] as string | undefined,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }
    orders.push(newOrder)

    if (sql.includes('RETURNING *')) {
      return { rows: [newOrder], rowCount: 1 }
    }
    return { rows: [newOrder], rowCount: 1 }
  }

  if (sql.includes('INSERT INTO order_items')) {
    orderItems.push({
      id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_id: p[0] as string,
      product_id: p[1] as string,
      quantity: p[2] as number,
      unit_price: p[3] as number,
    })
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('UPDATE orders SET status')) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = orders.findIndex(o => o.id === idParam)
      if (idx >= 0) {
        orders[idx].status = p[0] as string
        if (sql.includes('RETURNING *')) {
          return { rows: [orders[idx]], rowCount: 1 }
        }
        return { rows: [orders[idx]], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('UPDATE orders SET stripe_payment_intent') || sql.includes("stripe_payment_id = $1")) {
    const idParam = extractParam(sql, /WHERE\s+id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const idx = orders.findIndex(o => o.id === idParam)
      if (idx >= 0 && sql.includes("status = 'PAID'")) {
        orders[idx].status = 'PAID'
        orders[idx].stripe_payment_id = p[0] as string
      } else if (idx >= 0) {
        orders[idx].stripe_payment_intent = p[0] as string
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE o.consumer_id') || sql.includes('WHERE o.producer_id')) {
    const { limit, offset } = extractLimitOffset(sql, p)
    let filtered = [...orders]

    if (sql.includes('consumer_id')) {
      const consumerId = extractParam(sql, /consumer_id\s*=\s*\$(\d+)/i, p)
      if (consumerId) filtered = filtered.filter(o => o.consumer_id === consumerId)
    }
    if (sql.includes('producer_id')) {
      const producerId = extractParam(sql, /producer_id\s*=\s*\$(\d+)/i, p)
      if (producerId) filtered = filtered.filter(o => o.producer_id === producerId)
    }

    const statusParam = extractParam(sql, /o\.status\s*=\s*\$(\d+)/i, p)
    if (statusParam) {
      filtered = filtered.filter(o => o.status === statusParam)
    }

    filtered.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())

    const results = filtered.slice(offset, offset + limit).map(o => {
      const producer = producers.find(pr => pr.id === o.producer_id)
      const items = orderItems
        .filter(oi => oi.order_id === o.id)
        .map(oi => {
          const product = products.find(pr => pr.id === oi.product_id)
          return {
            ...oi,
            product_name: product?.name,
          }
        })

      return {
        ...o,
        producer_name: producer?.company_name,
        consumer_name: producer ? undefined : undefined,
        items,
      }
    })

    return { rows: results, rowCount: results.length }
  }

  if (sql.includes('WHERE o.id =')) {
    const idParam = extractParam(sql, /o\.id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const found = orders.find(o => o.id === idParam)
      if (found) {
        const items = orderItems
          .filter(oi => oi.order_id === found.id)
          .map(oi => {
            const product = products.find(pr => pr.id === oi.product_id)
            return {
              ...oi,
              product_name: product?.name,
            }
          })
        return { rows: [{ ...found, items }], rowCount: 1 }
      }
    }
    return { rows: [], rowCount: 0 }
  }

  if (sql.includes('WHERE id =')) {
    const idParam = extractParam(sql, /id\s*=\s*\$(\d+)/i, p)
    if (idParam) {
      const found = orders.find(o => o.id === idParam)
      if (found) return { rows: [found], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  }

  return { rows: [], rowCount: 0 }
}

export const mockDb = {
  query: async (text: string, params?: unknown[]) => {
    if (dbAvailable === true) throw new Error('DB_AVAILABLE')

    const sql = text.trim()
    const p = params ?? []

    if (sql.includes('FROM users') || sql.includes('INTO users') || sql.includes('DELETE FROM users') || sql.includes('UPDATE users SET')) {
      return handleUserQuery(sql, p)
    }

    if (sql.includes('FROM producers') || sql.includes('INTO producers') || sql.includes('UPDATE producers')) {
      return handleProducerQuery(sql, p)
    }

    if (sql.includes('FROM products') || sql.includes('INTO products') || sql.includes('DELETE FROM products') || sql.includes('UPDATE products SET') || sql.includes('UPDATE products SET stock')) {
      return handleProductQuery(sql, p)
    }

    if (sql.includes('FROM messages') || sql.includes('INTO messages') || sql.includes('UPDATE messages')) {
      return handleMessageQuery(sql, p)
    }

    if (sql.includes('FROM orders') || sql.includes('INTO orders') || sql.includes('INTO order_items') || sql.includes('UPDATE orders')) {
      return handleOrderQuery(sql, p)
    }

    if (sql.includes('order_items') && sql.includes('product_id') && sql.includes('p.id')) {
      return { rows: [], rowCount: 0 }
    }

    return { rows: [], rowCount: 0 }
  },

  getClient: () => ({
    query: async (text: string, params?: unknown[]) => {
      const sql = text.trim()
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [], rowCount: 0 }
      }
      return mockDb.query(text, params)
    },
    release: () => {},
  }),
}
