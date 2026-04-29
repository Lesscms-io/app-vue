/**
 * Visibility rule evaluator — shared by configurator widgets (flat + wizard).
 *
 * Rule shape (CNF: AND of OR groups):
 *   { and_groups: [ [optionUuidA, optionUuidB], [optionUuidC] ] }
 * The element is visible iff for EVERY and_group, AT LEAST ONE of its UUIDs
 * is in the currently-selected option set.
 *
 * Empty rule (null, undefined, or { and_groups: [] }) → always visible.
 *
 * Legacy fallback: if `visibility_rule` is null and `visible_when_option_uuids`
 * has values, treat that flat list as a single OR-group (matches old semantics).
 */

export interface VisibilityRule {
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
    return rule.and_groups.every((orGroup) =>
      orGroup.length === 0 || orGroup.some((uuid) => selected.has(uuid)),
    )
  }

  const legacy = carrier.visible_when_option_uuids
  if (legacy && legacy.length > 0) {
    return legacy.some((uuid) => selected.has(uuid))
  }

  return true
}
