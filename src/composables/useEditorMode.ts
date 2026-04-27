/**
 * Editor mode flag — provided by LessCMSProvider. The page builder sets it
 * to true so widgets render placeholders for empty/inactive content (e.g.
 * a campaign banner with no currently-active campaign). The production
 * renderer leaves it false so the same widget cleanly disappears.
 */

import { computed, inject, type ComputedRef, type Ref } from 'vue'

export function useEditorMode(): ComputedRef<boolean> {
  const flag = inject<boolean | Ref<boolean> | ComputedRef<boolean> | null>(
    'lesscms-editor-mode',
    false,
  )
  return computed(() => {
    if (flag === null || flag === undefined) return false
    if (typeof flag === 'object' && 'value' in flag) {
      return Boolean((flag as Ref<boolean>).value)
    }
    return Boolean(flag)
  })
}
