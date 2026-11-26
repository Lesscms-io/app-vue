// Normalize configured options into a uniform [{label, value, files}] list. Shape is
// what LcmsProductConfigurator.buildConfiguredCartMetadata produces (and what
// the order item keeps in metadata.configured_options):
// Array<{ group_name, option_name?, value?, type, files_meta?, ... }>.
// Plain Record<group, label> objects are accepted as a fallback for items
// added through producers that don't emit the typed array shape.
export interface ConfiguredFile { name: string; url?: string }
export interface ConfiguredRow { label: string; value: string; files?: ConfiguredFile[] }

export function normalizedConfiguredOptions(metadata: any): ConfiguredRow[] {
  const raw = metadata?.configured_options
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((opt: any): ConfiguredRow | null => {
        const label = String(opt?.group_name ?? opt?.group_uuid ?? '').trim()
        let value: string
        let files: ConfiguredFile[] | undefined
        if (opt?.type === 'option') value = String(opt?.option_name ?? opt?.option_uuid ?? '')
        else if (opt?.type === 'checkbox') value = String(opt?.checkbox_label ?? 'TAK')
        else if (opt?.type === 'numeric') value = String(opt?.value ?? '')
        else if (opt?.type === 'file') {
          const meta = Array.isArray(opt?.files_meta) ? opt.files_meta : []
          files = meta
            .filter((f: any) => f?.name)
            .map((f: any) => ({ name: String(f.name), url: /^https?:\/\//i.test(String(f?.url ?? '')) ? String(f.url) : undefined }))
          value = files!.map((f) => f.name).join(', ') || `${meta.length} plik(i)`
        } else value = String(opt?.value ?? '')
        if (!label || !value) return null
        return files && files.length ? { label, value, files } : { label, value }
      })
      .filter((x): x is ConfiguredRow => x !== null)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([k, v]): ConfiguredRow => ({ label: String(k), value: String(v) }))
      .filter((row) => row.label && row.value)
  }
  return []
}
