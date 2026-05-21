// ISO 3166-1 alpha-2 country list with Polish + English names.
// Curated set — full EU + most-shipped destinations. Adjust as shop expands.
export interface CountryEntry {
  code: string
  pl: string
  en: string
}

export const COUNTRIES: CountryEntry[] = [
  { code: 'PL', pl: 'Polska', en: 'Poland' },
  { code: 'AT', pl: 'Austria', en: 'Austria' },
  { code: 'BE', pl: 'Belgia', en: 'Belgium' },
  { code: 'BG', pl: 'Bułgaria', en: 'Bulgaria' },
  { code: 'HR', pl: 'Chorwacja', en: 'Croatia' },
  { code: 'CY', pl: 'Cypr', en: 'Cyprus' },
  { code: 'CZ', pl: 'Czechy', en: 'Czechia' },
  { code: 'DK', pl: 'Dania', en: 'Denmark' },
  { code: 'EE', pl: 'Estonia', en: 'Estonia' },
  { code: 'FI', pl: 'Finlandia', en: 'Finland' },
  { code: 'FR', pl: 'Francja', en: 'France' },
  { code: 'GR', pl: 'Grecja', en: 'Greece' },
  { code: 'ES', pl: 'Hiszpania', en: 'Spain' },
  { code: 'NL', pl: 'Holandia', en: 'Netherlands' },
  { code: 'IE', pl: 'Irlandia', en: 'Ireland' },
  { code: 'IS', pl: 'Islandia', en: 'Iceland' },
  { code: 'LT', pl: 'Litwa', en: 'Lithuania' },
  { code: 'LU', pl: 'Luksemburg', en: 'Luxembourg' },
  { code: 'LV', pl: 'Łotwa', en: 'Latvia' },
  { code: 'MT', pl: 'Malta', en: 'Malta' },
  { code: 'DE', pl: 'Niemcy', en: 'Germany' },
  { code: 'NO', pl: 'Norwegia', en: 'Norway' },
  { code: 'PT', pl: 'Portugalia', en: 'Portugal' },
  { code: 'RO', pl: 'Rumunia', en: 'Romania' },
  { code: 'SK', pl: 'Słowacja', en: 'Slovakia' },
  { code: 'SI', pl: 'Słowenia', en: 'Slovenia' },
  { code: 'SE', pl: 'Szwecja', en: 'Sweden' },
  { code: 'CH', pl: 'Szwajcaria', en: 'Switzerland' },
  { code: 'TR', pl: 'Turcja', en: 'Turkey' },
  { code: 'UA', pl: 'Ukraina', en: 'Ukraine' },
  { code: 'HU', pl: 'Węgry', en: 'Hungary' },
  { code: 'GB', pl: 'Wielka Brytania', en: 'United Kingdom' },
  { code: 'IT', pl: 'Włochy', en: 'Italy' },
  { code: 'US', pl: 'Stany Zjednoczone', en: 'United States' },
  { code: 'CA', pl: 'Kanada', en: 'Canada' },
  { code: 'AU', pl: 'Australia', en: 'Australia' },
  { code: 'NZ', pl: 'Nowa Zelandia', en: 'New Zealand' },
  { code: 'JP', pl: 'Japonia', en: 'Japan' },
]

export function countriesFor(language?: string): Array<{ code: string; label: string }> {
  const lang = language === 'en' ? 'en' : 'pl'
  return COUNTRIES.map(c => ({ code: c.code, label: c[lang] })).sort((a, b) => a.label.localeCompare(b.label, lang))
}
