/**
 * Liczebnik z poprawną odmianą rzeczownika: „1 produkt”, „3 produkty”, „5 produktów”, „22 produkty”.
 * Formy wybiera Intl.PluralRules (pl: one/few/many, en: one/other).
 * `label` to etykieta z ustawień widgetu: znana forma (np. „produktów”, „wyników”, „results”)
 * jest rozwijana do kompletu form; można też podać własne formy jako „produkt|produkty|produktów”.
 */
type Forms = Partial<Record<Intl.LDMLPluralRule, string>>

const KNOWN: Record<string, Forms> = {
  'produktów': { one: 'produkt', few: 'produkty', many: 'produktów', other: 'produktu' },
  'produkty': { one: 'produkt', few: 'produkty', many: 'produktów', other: 'produktu' },
  'wyników': { one: 'wynik', few: 'wyniki', many: 'wyników', other: 'wyniku' },
  'wyniki': { one: 'wynik', few: 'wyniki', many: 'wyników', other: 'wyniku' },
  'products': { one: 'product', other: 'products' },
  'results': { one: 'result', other: 'results' },
  'items': { one: 'item', other: 'items' },
}

function formsFor(label: string, lang: string): Forms | null {
  if (label.includes('|')) {
    const p = label.split('|').map((s) => s.trim())
    return lang.startsWith('pl') ? { one: p[0], few: p[1] ?? p[0], many: p[2] ?? p[1] ?? p[0], other: p[3] ?? p[1] ?? p[0] }
      : { one: p[0], other: p[1] ?? p[0] }
  }
  return KNOWN[label.trim().toLowerCase()] ?? null
}

export function pluralWord(n: number, label: string, lang = 'pl'): string {
  const forms = formsFor(label, lang)
  if (!forms) return label
  let rule: Intl.LDMLPluralRule = 'other'
  try { rule = new Intl.PluralRules(lang).select(n) } catch { /* stary silnik */ }
  return forms[rule] ?? forms.other ?? forms.many ?? label
}

export function pluralCount(n: number, label: string, lang = 'pl'): string {
  return `${n} ${pluralWord(n, label, lang)}`
}
