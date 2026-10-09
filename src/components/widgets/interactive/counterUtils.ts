/**
 * Counter widget helpers: data normalization (legacy flat -> element-groups)
 * and number formatting. Mirrored in fe CounterWidget.vue/CounterSettings.vue
 * and api/src/transformers/widgets/counter.js — keep them in sync.
 */

const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const pick = <T>(...vals: (T | undefined | null)[]): T | null => {
  for (const v of vals) if (v !== undefined && v !== null) return v
  return null
}

const affix = (v: unknown) => (Array.isArray(v) ? '' : v ?? '')

export interface CounterNormalized {
  number: Record<string, any>
  label: Record<string, any>
  config: Record<string, any>
}

export function normalizeCounterData(raw: unknown): CounterNormalized {
  const d: Record<string, any> = isObj(raw) ? raw : {}
  // Legacy flat format: `number` was a scalar, the rest sat on the root.
  const legacyNumber = isObj(d.number) ? undefined : d.number
  const n: Record<string, any> = isObj(d.number) ? d.number : {}
  const l: Record<string, any> = isObj(d.label) ? d.label : isObj(d.title) ? d.title : {}
  const c: Record<string, any> = isObj(d.config) ? d.config : {}

  const number = {
    number: pick(n.number, legacyNumber) ?? 0,
    from: n.from ?? null,
    duration: pick(n.duration, d.duration) ?? 1600,
    decimals: n.decimals ?? null,
    prefix: affix(pick(n.prefix, d.prefix)),
    suffix: affix(pick(n.suffix, d.suffix)),
    separator: n.separator ?? 'space', // missing key = legacy (toLocaleString) look
    style: n.style ?? 'fill', // missing key = legacy look
    color: pick(n.color, d.number_color) ?? null,
    'color:hover': pick(n['color:hover'], d.hover_number_color) ?? null,
    prefix_color: pick(n.prefix_color, d.prefix_color) ?? null,
    outline_width: n.outline_width ?? 1.5,
    font_stretch: n.font_stretch ?? null,
    text_style: n.text_style ?? '',
    size: n.size ?? 'xl',
    tag: n.tag ?? 'p'
  }

  const label = {
    text: pick(l.text, l.html, l.content, typeof d.title === 'string' ? d.title : null) ?? '',
    color: pick(l.color, d.title_color) ?? null,
    'color:hover': pick(l['color:hover'], d.hover_title_color) ?? null,
    tag: l.tag ?? 'p'
  }

  const config = {
    alignment: pick(c.alignment, d.alignment) ?? 'center',
    gap: pick(c.gap, d.gap) ?? 10,
    animate_on_scroll: c.animate_on_scroll ?? true,
    once: c.once ?? true
  }

  return { number, label, config }
}

const SEPARATORS: Record<string, string> = {
  none: '',
  space: ' ',
  dot: '.',
  comma: ','
}

export function separatorChar(code: string | null | undefined): string {
  return SEPARATORS[code ?? 'none'] ?? ''
}

/** Formats a count-up value: decimals, thousands separator, '.' or ',' decimal mark. */
export function formatCounterValue(value: number, decimals: number, separator: string): string {
  const fixed = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
  const [intPart, fracPart] = fixed.split('.')
  const sign = intPart.startsWith('-') ? '-' : ''
  const digits = sign ? intPart.slice(1) : intPart
  const grouped = separator ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : digits
  if (fracPart === undefined) return sign + grouped
  const decimalMark = separator === '.' ? ',' : '.'
  return `${sign}${grouped}${decimalMark}${fracPart}`
}
