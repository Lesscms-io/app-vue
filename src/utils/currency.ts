/**
 * Currency formatting utilities for ecommerce widgets.
 */

const LOCALE_BY_CURRENCY: Record<string, string> = {
  PLN: 'pl-PL',
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  CZK: 'cs-CZ',
}

/**
 * Format a price as currency string.
 * @example formatPrice(99.99, 'PLN') → "99,99 zł"
 * @example formatPrice(199, 'USD') → "$199.00"
 */
export function formatPrice(amount: number | string | null | undefined, currency: string = 'PLN'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === null || num === undefined || isNaN(num as number)) {
    return ''
  }

  const locale = LOCALE_BY_CURRENCY[currency.toUpperCase()] || 'pl-PL'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num as number)
  } catch {
    return `${num} ${currency}`
  }
}

/**
 * Calculate discount percentage between two prices.
 * @example calculateDiscount(100, 80) → 20
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) return 0
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}
