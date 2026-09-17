import { describe, expect, it } from 'vitest'
import { normalizeChatProduct } from './chatProduct'

describe('normalizeChatProduct', () => {
  it('maps BM Store product fields', () => {
    const product = normalizeChatProduct({
      _id: 'abc123',
      name: 'Argan Oil',
      nameAr: 'زيت أركان',
      price: 2500,
      image: '',
      images: ['https://example.com/argan.jpg'],
      category: 'cat1',
      categoryName: 'Oils',
      stock: 12,
      isActive: true,
      status: 'active',
    })

    expect(product).toEqual({
      id: 'abc123',
      name: 'Argan Oil',
      nameAr: 'زيت أركان',
      category: 'Oils',
      price: 2500,
      stock: 12,
      sizes: {},
      image: 'https://example.com/argan.jpg',
    })
  })

  it('maps chatbot catalog fields', () => {
    const product = normalizeChatProduct({
      id: 'p1',
      name_darija: 'قفطان',
      price_mad: 1400,
      stock_total: 3,
      sizes: { S: 1, M: 0 },
      category: 'ملابس',
      image: 'https://example.com/caftan.jpg',
    })

    expect(product?.id).toBe('p1')
    expect(product?.name).toBe('قفطان')
    expect(product?.nameAr).toBe('قفطان')
    expect(product?.price).toBe(1400)
    expect(product?.stock).toBe(1)
    expect(product?.sizes).toEqual({ S: 1, M: 0 })
  })

  it('returns null for incomplete payloads', () => {
    expect(normalizeChatProduct({ name: 'No id' })).toBeNull()
    expect(normalizeChatProduct(null)).toBeNull()
  })
})
