/**
 * Adres wpisu kolekcji w danym języku.
 *
 * metadata.urls[lang] bierzemy tylko, gdy ma prefiks języka — adres języka
 * domyślnego zostaje po staremu w metadata.url (renderer rozpoznaje wpisy po
 * wzorcu trasy). Wpis nieprzetłumaczony → adres domyślny zamiast 404 pod /{lang}/.
 */
export function localizedEntryUrl(
  metadata: Record<string, any> | undefined | null,
  language: string | undefined | null,
): string | null {
  const localized = language ? metadata?.urls?.[language] : null
  if (typeof localized === 'string' && (localized === `/${language}` || localized.startsWith(`/${language}/`))) {
    return localized
  }
  return metadata?.url || null
}
