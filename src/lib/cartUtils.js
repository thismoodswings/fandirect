const CART_KEY = 'fandirect_cart'

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function emitCartUpdated() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event('cart-updated'))
}

export function getCart() {
  if (!isBrowser()) return []

  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(cart) ? cart : []
  } catch {
    return []
  }
}

export function saveCart(cart) {
  if (!isBrowser()) return

  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(cart) ? cart : []))
  emitCartUpdated()
}

export function addToCart(product, quantity = 1) {
  if (!product?.id) return

  const cart = getCart()
  const nextQuantity = Math.max(1, Number(quantity || 1))
  const existing = cart.find((item) => item.product_id === product.id)

  if (existing) {
    existing.quantity = Number(existing.quantity || 0) + nextQuantity
  } else {
    cart.push({
      product_id: product.id,
      title: product.title || product.name || 'Untitled product',
      price: Number(product.price || 0),
      image_url: product.image_url || '',
      creator_id: product.creator_id || '',
      creator_name: product.creator_name || '',
      type: product.type || 'merch',
      creator_base_price: Number(product.creator_base_price || 0),
      platform_fee_rate: Number(product.platform_fee_rate || 0.05),
      platform_fee_amount: Number(product.platform_fee_amount || 0),
      fan_price: Number(product.fan_price || product.price || 0),
      access_tier: product.access_tier || product.required_tier || 'free',
      shipping_required: product.shipping_required ?? !['digital', 'event', 'experience'].includes(product.type || 'merch'),
      sku: product.sku || '',
      quantity: nextQuantity,
    })
  }

  saveCart(cart)
}

export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.product_id !== productId)
  saveCart(cart)
}

export function updateCartQuantity(productId, quantity) {
  const cart = getCart()
  const item = cart.find((cartItem) => cartItem.product_id === productId)

  if (item) {
    item.quantity = Math.max(1, Number(quantity || 1))
  }

  saveCart(cart)
}

export function clearCart() {
  saveCart([])
}

export function getCartTotal(cart = getCart()) {
  return cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  )
}

export function getCartCount(cart = getCart()) {
  return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}