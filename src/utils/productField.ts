/**
 * Shared utilities for product field access across ecommerce widgets.
 */

/**
 * Get a product field value by dot-notation path.
 * If the value is an array (e.g., gallery), returns the first element.
 */
export function getProductField(product: any, path: string): any {
  if (!path || !product) return null
  const val = path.split('.').reduce((obj: any, key: string) => obj?.[key], product)
  return Array.isArray(val) ? val[0] ?? null : val
}

/**
 * Get a product field value without unwrapping arrays.
 */
export function getProductFieldRaw(product: any, path: string): any {
  if (!path || !product) return null
  return path.split('.').reduce((obj: any, key: string) => obj?.[key], product)
}

/**
 * Format an attribute value for display based on its type.
 */
export function formatAttributeValue(value: any, type: string, language = 'pl'): string {
  if (value == null) return ''
  if (Array.isArray(value)) {
    return value.map(v => typeof v === 'object' ? (v.value || JSON.stringify(v)) : String(v)).join(', ')
  }
  if (typeof value === 'object') {
    return value[language] || Object.values(value)[0] || ''
  }
  if (type === 'bool') return value ? 'Tak' : 'Nie'
  return String(value)
}
