export interface ChatProduct {
  id: string
  name: string
  nameAr?: string
  category: string
  price: number | null
  stock: number | null
  sizes: Record<string, number>
  image?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function firstImage(raw: Record<string, unknown>): string | undefined {
  const image = asString(raw.image)
  if (image) return image
  const thumbnail = asString(raw.thumbnail)
  if (thumbnail) return thumbnail
  if (Array.isArray(raw.images)) {
    const first = raw.images.find((item) => typeof item === 'string' && item.trim())
    if (typeof first === 'string') return first
  }
  return undefined
}

function parseSizes(value: unknown): Record<string, number> {
  const record = asRecord(value)
  if (!record) return {}
  const sizes: Record<string, number> = {}
  for (const [size, qty] of Object.entries(record)) {
    const amount = asNumber(qty)
    if (amount !== null) sizes[size] = amount
  }
  return sizes
}

/** Accepts chatbot catalog fields or BM Store product payloads. */
export function normalizeChatProduct(raw: unknown): ChatProduct | null {
  const product = asRecord(raw)
  if (!product) return null

  const id = asString(product.id) || asString(product._id)
  if (!id) return null

  const name = asString(product.name) || asString(product.name_darija) || asString(product.nameAr) || asString(product.nameFr)
  if (!name) return null

  const sizes = parseSizes(product.sizes)
  const stockFromSizes = Object.keys(sizes).length
    ? Object.values(sizes).reduce((sum, qty) => sum + qty, 0)
    : null

  return {
    id,
    name,
    nameAr: asString(product.nameAr) || asString(product.name_darija),
    category: asString(product.categoryName) || asString(product.category) || '',
    price: asNumber(product.price_mad) ?? asNumber(product.price),
    stock: stockFromSizes ?? asNumber(product.stock_total) ?? asNumber(product.stock),
    sizes,
    image: firstImage(product),
  }
}
