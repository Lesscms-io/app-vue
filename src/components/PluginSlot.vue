<script setup lang="ts">
/**
 * PluginSlot — renders all components registered by plugins for a given slot.
 *
 * Two rendering modes:
 *  1. Default: renders each component stacked (passes `context` as props).
 *  2. Scoped slot: yields the slot entries to the parent so the parent can
 *     drive its own UI (tabs, accordion, list, etc.). Use this when the
 *     consumer needs to render headers and content separately, like tabs.
 *
 * Plugin contributions come from the registry provided by the host app
 * (see `usePluginExtensions`); core knows nothing about specific plugins.
 */

import { computed, defineAsyncComponent } from 'vue'
import { useSlotEntries, type PluginSlotEntry } from '../composables/usePluginExtensions'

interface Props {
  name: string
  context?: Record<string, unknown>
}

const props = defineProps<Props>()

interface ResolvedEntry extends PluginSlotEntry {
  component: ReturnType<typeof defineAsyncComponent>
}

const entries = computed<ResolvedEntry[]>(() =>
  useSlotEntries(props.name).map((entry) => ({
    ...entry,
    component: defineAsyncComponent(entry.loader),
  })),
)

defineSlots<{
  /**
   * Scoped slot: parent drives rendering. Receives the resolved entries
   * (with `component` already wrapped in defineAsyncComponent).
   */
  default?: (props: { entries: ResolvedEntry[] }) => any
}>()
</script>

<template>
  <slot :entries="entries">
    <component
      :is="entry.component"
      v-for="entry in entries"
      :key="`${entry.pluginId}:${entry.key}`"
      v-bind="context"
    />
  </slot>
</template>
