import * as XLSX from 'xlsx'
import { normalizeProductPricing } from './pricing'

const FIELD_ALIASES = {
  title: ['title', 'name', 'product', 'product name', 'item', 'item name'],
  description: ['description', 'desc', 'details'],
  sku: ['sku', 'stock keeping unit', 'inventory id'],
  type: ['type', 'product type', 'kind'],
  category: ['category', 'collection'],
  creator_base_price: ['creator_base_price', 'creator base price', 'base price', 'price', 'amount'],
  stock: ['stock', 'inventory', 'quantity', 'qty'],
  sizes: ['sizes', 'size'],
  colors: ['colors', 'colour', 'color'],
  image_url: ['image_url', 'image url', 'image', 'photo', 'photo url'],
  status: ['status'],
  shipping_required: ['shipping_required', 'shipping required', 'requires shipping'],
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, ' ')
    .replace(/_/g, ' ')
}

function findValue(row, field) {
  const aliases = FIELD_ALIASES[field] || [field]
  const entries = Object.entries(row || {})

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias)
    const match = entries.find(([key]) => normalizeHeader(key) === normalizedAlias)
    if (match) return match[1]
  }

  return undefined
}

function splitList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return String(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['true', 'yes', 'y', '1', 'required'].includes(normalized)) return true
  if (['false', 'no', 'n', '0', 'not required'].includes(normalized)) return false
  return fallback
}

export function normalizeImportedProduct(row, creator = {}) {
  const title = String(findValue(row, 'title') || '').trim()
  const creatorBasePrice = Number(findValue(row, 'creator_base_price') || 0)

  const sizes = splitList(findValue(row, 'sizes'))
  const colors = splitList(findValue(row, 'colors'))
  const detailLines = [
    String(findValue(row, 'description') || '').trim(),
    sizes.length ? `Sizes: ${sizes.join(', ')}` : '',
    colors.length ? `Colors: ${colors.join(', ')}` : '',
    String(findValue(row, 'sku') || '').trim() ? `SKU: ${String(findValue(row, 'sku')).trim()}` : '',
  ].filter(Boolean)

  return normalizeProductPricing({
    title,
    description: detailLines.join('\n'),
    type: String(findValue(row, 'type') || 'merch').trim().toLowerCase(),
    creator_base_price: creatorBasePrice,
    stock: Number(findValue(row, 'stock') || 0),
    image_url: String(findValue(row, 'image_url') || '').trim(),
    status: String(findValue(row, 'status') || 'active').trim().toLowerCase(),
    creator_id: creator.id || '',
    creator_name: creator.name || creator.display_name || '',
    cashback_percent: 0,
    loyalty_points: 0,
    is_limited: false,
  })
}

export async function readProductImportFile(file, creator = {}) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

  const normalized = rows.map((row, index) => {
    const product = normalizeImportedProduct(row, creator)
    const errors = []

    if (!product.title) errors.push('Missing title')
    if (!product.creator_base_price) errors.push('Missing base price')
    if (!product.creator_id) errors.push('Missing creator')

    return {
      rowNumber: index + 2,
      raw: row,
      product,
      errors,
    }
  })

  return normalized
}
