/**
 * Date duration / relative helpers for the Timeline widget.
 *
 * All input dates are plain ISO day strings ('YYYY-MM-DD'). Parsing pins the
 * time to local midday so DST / timezone shifts never bump the calendar day.
 *
 * Localized for pl + en; any other language falls back to en words but keeps
 * Intl date formatting in the requested locale.
 */

interface Breakdown {
  years: number
  months: number
  days: number
  totalDays: number
}

interface Words {
  year: [string, string, string] // one, few, many
  month: [string, string, string]
  day: [string, string, string]
  and: string
  agoSuffix: string
  futurePrefix: string
  today: string
  durationLabel: string
}

const WORDS: Record<string, Words> = {
  pl: {
    year: ['rok', 'lata', 'lat'],
    month: ['miesiąc', 'miesiące', 'miesięcy'],
    day: ['dzień', 'dni', 'dni'],
    and: 'i',
    agoSuffix: 'temu',
    futurePrefix: 'za',
    today: 'dziś',
    durationLabel: 'trwało'
  },
  en: {
    year: ['year', 'years', 'years'],
    month: ['month', 'months', 'months'],
    day: ['day', 'days', 'days'],
    and: 'and',
    agoSuffix: 'ago',
    futurePrefix: 'in',
    today: 'today',
    durationLabel: 'lasted'
  }
}

function words(lang?: string): Words {
  return WORDS[(lang || '').slice(0, 2)] || WORDS.en
}

/** Polish-style plural selection; for en the few/many slots are identical. */
function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n)
  if (abs === 1) return forms[0]
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1]
  return forms[2]
}

export function parseDate(value?: string | null): Date | null {
  if (!value || typeof value !== 'string') return null
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0)
  // Reject overflow (e.g. 2024-02-31 → March)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

/** Calendar-accurate years/months/days between two dates (from <= to). */
function breakdown(from: Date, to: Date): Breakdown {
  let years = to.getFullYear() - from.getFullYear()
  let months = to.getMonth() - from.getMonth()
  let days = to.getDate() - from.getDate()
  if (days < 0) {
    months -= 1
    // days in the month preceding `to`
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000)
  return { years, months, days, totalDays }
}

function humanizeBreakdown(bd: Breakdown, lang?: string): string {
  const w = words(lang)
  const parts: string[] = []
  if (bd.years) parts.push(`${bd.years} ${plural(bd.years, w.year)}`)
  if (bd.months) parts.push(`${bd.months} ${plural(bd.months, w.month)}`)
  if (bd.days) parts.push(`${bd.days} ${plural(bd.days, w.day)}`)
  if (parts.length === 0) parts.push(`0 ${plural(0, w.day)}`)
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} ${w.and} ${parts[parts.length - 1]}`
}

function daysSuffix(totalDays: number, lang?: string): string {
  const w = words(lang)
  return `${totalDays} ${plural(totalDays, w.day)}`
}

/**
 * "1 rok, 2 miesiące i 4 dni (432 dni)" — elapsed time between two dates.
 * Returns '' when the range is invalid (missing / to < from).
 */
export function humanizeDuration(fromStr?: string | null, toStr?: string | null, lang?: string): string {
  const from = parseDate(fromStr)
  const to = parseDate(toStr)
  if (!from || !to || to.getTime() < from.getTime()) return ''
  const bd = breakdown(from, to)
  return `${humanizeBreakdown(bd, lang)} (${daysSuffix(bd.totalDays, lang)})`
}

/**
 * "2 lata i 3 miesiące temu (830 dni)" — time from a date to `now`.
 * Handles future dates ("za …" / "in …") and same-day ("dziś" / "today").
 * Returns '' when the date is missing / invalid.
 */
export function humanizeRelative(fromStr?: string | null, lang?: string, now: Date = new Date()): string {
  const from = parseDate(fromStr)
  if (!from) return ''
  const w = words(lang)
  const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const diffDays = Math.round((ref.getTime() - from.getTime()) / 86400000)
  if (diffDays === 0) return w.today
  const past = diffDays > 0
  const [a, b] = past ? [from, ref] : [ref, from]
  const bd = breakdown(a, b)
  const core = humanizeBreakdown(bd, lang)
  const brackets = daysSuffix(bd.totalDays, lang)
  if (past) return `${core} ${w.agoSuffix} (${brackets})`
  return `${w.futurePrefix} ${core} (${brackets})`
}

/**
 * Human-readable label auto-derived from the date(s), e.g. "12 stycznia 2024"
 * or "12 stycznia 2024 – 4 marca 2025". Returns '' when no valid start date.
 */
/** Localized prefix for the "how long it lasted" line ("trwało" / "lasted"). */
export function durationLabel(lang?: string): string {
  return words(lang).durationLabel
}

export function formatDateLabel(fromStr?: string | null, toStr?: string | null, lang?: string): string {
  const from = parseDate(fromStr)
  if (!from) return ''
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat(lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    fmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const to = parseDate(toStr)
  if (to && to.getTime() !== from.getTime()) {
    return `${fmt.format(from)} – ${fmt.format(to)}`
  }
  return fmt.format(from)
}
