export const PLATFORM_FEE_RATE = 0.05

export function toMoney(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.round(number * 100) / 100)
}

export function calculatePlatformPricing(basePrice, feeRate = PLATFORM_FEE_RATE) {
  const creatorBasePrice = toMoney(basePrice)
  const resolvedFeeRate = Number.isFinite(Number(feeRate)) ? Number(feeRate) : PLATFORM_FEE_RATE
  const platformFeeAmount = toMoney(creatorBasePrice * resolvedFeeRate)
  const fanPrice = toMoney(creatorBasePrice + platformFeeAmount)

  return {
    creator_base_price: creatorBasePrice,
    platform_fee_rate: resolvedFeeRate,
    platform_fee_amount: platformFeeAmount,
    fan_price: fanPrice,
    price: fanPrice,
  }
}

export function normalizeProductPricing(product = {}) {
  const basePrice = product.creator_base_price ?? product.base_price ?? product.price ?? 0
  const pricing = calculatePlatformPricing(basePrice, product.platform_fee_rate ?? PLATFORM_FEE_RATE)

  return {
    ...product,
    ...pricing,
    original_price: toMoney(product.original_price || 0),
  }
}

export function getDisplayPrice(product = {}) {
  return Number(product.fan_price ?? product.price ?? 0)
}

export function getCreatorBasePrice(product = {}) {
  return Number(product.creator_base_price ?? product.price ?? 0)
}

export function summarizeCartPricing(cart = []) {
  return cart.reduce(
    (summary, item) => {
      const quantity = Number(item.quantity || 0)
      const base = Number(item.creator_base_price ?? item.price ?? 0)
      const fee = Number(item.platform_fee_amount ?? base * PLATFORM_FEE_RATE)
      const fan = Number(item.fan_price ?? item.price ?? base + fee)

      summary.creatorSubtotal += base * quantity
      summary.platformFeeTotal += fee * quantity
      summary.total += fan * quantity
      summary.itemCount += quantity
      return summary
    },
    {
      creatorSubtotal: 0,
      platformFeeTotal: 0,
      total: 0,
      itemCount: 0,
    }
  )
}

export function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}
