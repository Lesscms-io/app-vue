<script setup lang="ts">
/**
 * Embed Widget
 *
 * Renders custom HTML/JS embed code.
 *
 * v-html never executes <script> tags, and SSR markup would run them on parse
 * anyway. So every script is rendered inert (type="text/plain", original type
 * kept in data-lcms-type) and revived on the client after mount: re-created in
 * document order, external ones awaited before the next script. Nothing runs
 * in editor mode.
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EmbedWidgetData } from '@/types/widgets'
import { useEditorMode } from '../../../composables/useEditorMode'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: EmbedWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

// Flat config ref for verifier compatibility
const config = computed(() => props.data || {} as Record<string, any>)

const code = computed(() => config.value.code || '')
const height = computed(() => {
  const h = parseInt(String(config.value.height))
  return h > 0 ? h : null
})

const editorMode = useEditorMode()
const rootEl = ref<HTMLElement | null>(null)

// Inert version of the code: keeps the original type in data-lcms-type.
const renderedCode = computed(() => code.value.replace(/<script\b([^>]*)>/gi, (_match, attrs: string) => {
  const typeMatch = attrs.match(/\stype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i)
  const type = typeMatch ? (typeMatch[1] ?? typeMatch[2] ?? typeMatch[3] ?? '') : ''
  const rest = typeMatch ? attrs.replace(typeMatch[0], '') : attrs
  return `<script type="text/plain" data-lcms-type="${type.replace(/"/g, '&quot;')}"${rest}>`
}))

const isJsType = (type: string) =>
  !type || /^(text|application)\/(x-)?(java|ecma)script$/i.test(type.trim()) || /^module$/i.test(type.trim())

let runId = 0

async function runScripts(): Promise<void> {
  if (typeof document === 'undefined') return
  const id = ++runId
  const root = rootEl.value
  if (!root || editorMode.value) return

  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>('script[data-lcms-type]'))

  for (const old of scripts) {
    if (id !== runId) return

    const type = old.getAttribute('data-lcms-type') ?? ''
    const fresh = document.createElement('script')
    for (const attr of Array.from(old.attributes)) {
      if (attr.name === 'type' || attr.name === 'data-lcms-type') continue
      fresh.setAttribute(attr.name, attr.value)
    }
    if (type) fresh.type = type
    if (!old.hasAttribute('async')) fresh.async = false
    fresh.textContent = old.textContent

    const external = old.hasAttribute('src')
    const waitForLoad = isJsType(type) && external && !old.hasAttribute('async')
    const loaded = waitForLoad
      ? new Promise<void>((resolve) => {
          fresh.onload = () => resolve()
          fresh.onerror = () => resolve()
        })
      : null

    // Inserting a connected script element executes it.
    old.replaceWith(fresh)
    if (loaded) await loaded
  }
}

onMounted(() => {
  void runScripts()
})

// Runs after v-html has patched the DOM with the new code.
watch([renderedCode, editorMode], () => {
  void runScripts()
}, { flush: 'post' })

onBeforeUnmount(() => {
  runId++
})
</script>

<template>
  <div
    ref="rootEl"
    class="lcms-embed"
    :style="height ? { height: `${height}px` } : {}"
    v-html="renderedCode"
  />
</template>

<style scoped>
.lcms-embed {
  width: 100%;
  overflow: hidden;
}

.lcms-embed :deep(iframe) {
  max-width: 100%;
}
</style>
