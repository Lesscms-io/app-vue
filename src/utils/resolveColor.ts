/**
 * Centralized color resolution for LessCMS var:xxx format.
 *
 * Supported formats:
 *   "var:primary"         → "var(--lcms-color-primary)"
 *   "var:primary:50"      → "color-mix(in srgb, var(--lcms-color-primary) 50%, transparent)"
 *   "#ffffff"             → "#ffffff"  (pass-through)
 *   "#ffffff:50"          → "rgba(255, 255, 255, 0.5)"
 *   "rgb(...)" / "rgba(…)" → pass-through
 *   null / undefined / "" → ""
 */

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function resolveColor(val: string | null | undefined): string {
  if (!val) return ''

  // var:colorCode or var:colorCode:opacity
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }

  // #hex:opacity  (e.g. "#667eea:50")
  if (val.startsWith('#') && val.includes(':')) {
    const [hex, opacityStr] = val.split(':')
    const opacity = parseInt(opacityStr) || 100
    if (opacity < 100) {
      return hexToRgba(hex, opacity / 100)
    }
    return hex
  }

  // Everything else (hex, rgb, rgba, named colors) — pass-through
  return val
}
