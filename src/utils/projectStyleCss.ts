// Project Style → CSS for named text styles (.lcms-ts-<code>) and section
// presets (.lcms-section--preset-<code>). Keep in sync with the copies in
// app/vue/src/utils, renderer/app/utils and fe/src/utils.

const CODE_RE = /^[a-z0-9-]+$/

export function colorCss(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const parts = s.split(':')
  let base: string
  let opacity: number = 100
  if (s.startsWith('var:')) {
    base = `var(--lcms-color-${parts[1]})`
    if (parts[2]) opacity = parseInt(parts[2], 10)
  } else {
    base = parts[0]
    if (parts[1]) opacity = parseInt(parts[1], 10)
  }
  if (opacity < 100) return `color-mix(in srgb, ${base} ${opacity}%, transparent)`
  return base
}

export function buildProjectStyleCss(styles: Record<string, any> | null | undefined): string {
  if (!styles || typeof styles !== 'object') return ''
  const out: string[] = []

  for (const ts of Array.isArray(styles.text_styles) ? styles.text_styles : []) {
    const code = String(ts?.code ?? '')
    if (!CODE_RE.test(code)) continue
    const sel = `.lcms-ts-${code}`
    const decl: string[] = [`font-family: ${ts.font === 'body' ? 'var(--lcms-font-body, inherit)' : 'var(--lcms-font-heading, inherit)'}`]
    if (ts.size) decl.push(`font-size: ${ts.size}`)
    if (ts.weight) decl.push(`font-weight: ${ts.weight}`)
    if (ts.stretch) decl.push(`font-stretch: ${ts.stretch}%`)
    if (ts.transform) decl.push(`text-transform: ${ts.transform}`)
    if (ts.tracking) decl.push(`letter-spacing: ${ts.tracking}`)
    const color = colorCss(ts.color)
    const outlineColor = colorCss(ts.outline_color) || color || 'currentColor'
    if (ts.outline) {
      decl.push('color: transparent')
      decl.push(`-webkit-text-stroke: ${Number(ts.outline_width) || 0}px ${outlineColor}`)
    } else if (color) {
      decl.push(`color: ${color}`)
    }
    // Named style must beat per-level defaults (h1..h6 rules) and element-group colors.
    const body = decl.map(d => `${d} !important`).join('; ')
    out.push(`${sel}, ${sel} :is(h1, h2, h3, h4, h5, h6, p, li) { ${body}; transition: color 200ms ease; }`)

    if (ts.outline && ts.fill_on_hover) {
      out.push(`${sel}:hover, ${sel}:hover :is(h1, h2, h3, h4, h5, h6, p, li), .lcms-widget:hover ${sel}, .lcms-widget:hover ${sel} :is(h1, h2, h3, h4, h5, h6, p, li) { color: ${outlineColor} !important; }`)
    }
    if (ts.line_before) {
      out.push(`${sel}:not(:has(> *))::before, ${sel} :is(h1, h2, h3, h4, h5, h6, p):first-child::before { content: ""; display: inline-block; width: 36px; height: 2px; margin-right: 12px; vertical-align: middle; background: var(--lcms-color-accent, var(--lcms-color-primary, currentColor)); }`)
    }
  }

  for (const p of Array.isArray(styles.section_presets) ? styles.section_presets : []) {
    const code = String(p?.code ?? '')
    if (!CODE_RE.test(code)) continue
    const bg = colorCss(p.background)
    const text = colorCss(p.text_color)
    const muted = colorCss(p.muted_color)
    const border = colorCss(p.border_color)
    const accent = colorCss(p.accent_color)
    const decl: string[] = []
    if (bg) decl.push(`background-color: ${bg}`)
    // Text colour must reach the section's own content, not only the CSS vars
    // (otherwise inherited black text sits on the dark preset).
    if (text) decl.push(`color: ${text}`)
    if (p.grid === 'blueprint') {
      const line = border || 'rgba(0, 0, 0, 0.08)'
      decl.push(`background-image: linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`)
      decl.push('background-size: 40px 40px')
    }
    // Widgets inside pick these up through the cascade. A value pointing at the
    // same variable (e.g. var:border) would make it self-referencing: skip it.
    const vars = [
      ['--lcms-color-background', bg], ['--lcms-color-text', text], ['--lcms-p-color', text],
      ...[1, 2, 3, 4, 5, 6].map(l => [`--lcms-h${l}-color`, text]),
      ['--lcms-color-muted', muted], ['--lcms-color-border', border], ['--lcms-color-accent', accent],
    ]
    for (const [name, value] of vars) {
      if (value && !value.includes(`var(${name})`)) decl.push(`${name}: ${value}`)
    }
    if (decl.length) out.push(`.lcms-section--preset-${code} { ${decl.join('; ')}; }`)
  }

  return out.join('\n')
}
