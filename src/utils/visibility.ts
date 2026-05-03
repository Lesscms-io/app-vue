/**
 * Visibility rule evaluator — shared by configurator widgets (flat + wizard).
 *
 * Rule shape (CNF: AND of OR groups):
 *   { mode?: 'show_when' | 'hide_when', and_groups: [ [optionUuidA, optionUuidB], [optionUuidC] ] }
 *
 * `show_when` (default, backwards compatible): element visible iff every
 * and_group has at least one selected uuid.
 * `hide_when`: element HIDDEN when those same conditions are met — i.e.
 * inverted output.
 *
 * Empty rule (null, undefined, or { and_groups: [] }) → always visible,
 * regardless of mode (no condition = nothing to gate on).
 *
 * Legacy fallback: if `visibility_rule` is null and `visible_when_option_uuids`
 * has values, treat that flat list as a single OR-group (matches old semantics).
 */

export type VisibilityMode = 'show_when' | 'hide_when'

export interface VisibilityRule {
  mode?: VisibilityMode
  and_groups: string[][]
}

export interface VisibilityCarrier {
  visibility_rule?: VisibilityRule | null
  visible_when_option_uuids?: string[] | null
}

export function isVisible(carrier: VisibilityCarrier | null | undefined, selected: Set<string>): boolean {
  if (!carrier) return true

  const rule = carrier.visibility_rule
  if (rule && Array.isArray(rule.and_groups) && rule.and_groups.length > 0) {
    const conditionsMet = rule.and_groups.every((orGroup) =>
      orGroup.length === 0 || orGroup.some((uuid) => selected.has(uuid)),
    )
    return rule.mode === 'hide_when' ? !conditionsMet : conditionsMet
  }

  const legacy = carrier.visible_when_option_uuids
  if (legacy && legacy.length > 0) {
    return legacy.some((uuid) => selected.has(uuid))
  }

  return true
}
