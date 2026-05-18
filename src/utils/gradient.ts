// Build a CSS gradient string from API-shape settings + resolved colors.
//
// The editor saves four knobs for any gradient (linear OR radial):
//   - gradient_type:     'linear' | 'radial'
//   - gradient_angle:    0-360 (linear only)
//   - gradient_position: '<x>' | 'center' | 'top' | … (radial only)
//   - gradient_intensity: 0-100 (both)
//
// `gradient_intensity` controls how sharp the transition is:
//   0   → smooth fade  (start 0%, end 100%)
//   50  → mid plateau  (start 0%, start 25%, end 75%, end 100%)
//   100 → sharp cut    (start 0%, start 50%, end 50%, end 100%)
//
// API output is `{ gradient: { type, color_start, color_end, angle?, position?, intensity? } }`.
// Legacy flat fields (use_gradient, gradient_type, gradient_color_start, …) are also accepted.

export interface GradientLike {
  type?: string
  color_start?: string | null
  color_end?: string | null
  angle?: number
  position?: string
  intensity?: number
}

export function buildGradientStops (startColor: string, endColor: string, intensity = 0): string {
  const i = Math.max(0, Math.min(100, Number(intensity) || 0))
  if (i <= 0) return `${startColor} 0%, ${endColor} 100%`
  const hold = i / 2
  return `${startColor} 0%, ${startColor} ${hold.toFixed(2)}%, ${endColor} ${(100 - hold).toFixed(2)}%, ${endColor} 100%`
}

export function buildGradientCss (
  type: string,
  angle: number,
  position: string,
  intensity: number,
  startColor: string,
  endColor: string
): string {
  const stops = buildGradientStops(startColor, endColor, intensity)
  if (type === 'radial') {
    return `radial-gradient(circle at ${position || 'center'}, ${stops})`
  }
  return `linear-gradient(${angle}deg, ${stops})`
}
