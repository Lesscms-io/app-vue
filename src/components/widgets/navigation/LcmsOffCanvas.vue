<script setup lang="ts">
/**
 * Off-canvas Widget (premium)
 *
 * A trigger (button / icon / text) opening a drawer from any side with an
 * optional menu (from the CMS) and rich text. Teleported to body, scroll
 * locked, ESC / backdrop close, focus returns to the trigger.
 */

import { computed, ref, onBeforeUnmount, onMounted, onServerPrefetch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useMenu } from '@/composables/useMenu'
import { resolveColor } from '@/utils/resolveColor'
import type { OffCanvasWidgetData } from '@/types/widgets'
import type { MenuItem } from '@/api/types'

defineOptions({ inheritAttrs: false })

interface Props {
  data: OffCanvasWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const config = computed(() => (props.data as any).widget || props.data || {})
const triggerGroup = computed(() => config.value.trigger || {})
const panelGroup = computed(() => config.value.panel || {})
const backdropGroup = computed(() => config.value.backdrop || {})
const animationGroup = computed(() => config.value.animation || {})

const menuCode = computed(() => panelGroup.value.menu_code || '')
const { items: menuItems, refetch: fetchMenu } = useMenu(menuCode)
onServerPrefetch(async () => { if (menuCode.value) await fetchMenu() })
onMounted(() => { if (menuCode.value && !menuItems.value.length) fetchMenu() })

const triggerType = computed(() => triggerGroup.value.type || 'button')
const triggerText = computed(() => extractValue(triggerGroup.value.text) || '')
const triggerIcon = computed(() => triggerGroup.value.icon || 'fa-solid fa-bars')
const iconLeft = computed(() => triggerType.value !== 'text' && (triggerGroup.value.icon_position || 'left') === 'left')
const iconRight = computed(() => triggerType.value !== 'text' && triggerGroup.value.icon_position === 'right')
const RADIUS: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px', full: '50px' }
const triggerClass = computed(() => {
  if (triggerType.value !== 'button') return [`oc-trigger--${triggerType.value}`]
  const size = triggerGroup.value.size || 'md'
  return ['lcms-button__link', `lcms-button__link--${triggerGroup.value.style || 'primary'}`, size === 'md' ? '' : `lcms-button__link--size-${size}`]
})
const triggerStyle = computed(() => (triggerType.value === 'button'
  ? { borderRadius: RADIUS[triggerGroup.value.border_radius || 'md'] || '8px' }
  : { color: resolveColor(triggerGroup.value.color) || 'inherit' }))

const title = computed(() => extractValue(panelGroup.value.title) || '')
const html = computed(() => extractValue(panelGroup.value.html) || '')
const menuAbove = computed(() => (panelGroup.value.menu_position || 'above') === 'above')
const showClose = computed(() => panelGroup.value.close !== false)
const hrefOf = (node: MenuItem) => node.metadata?.url || '#'
const labelOf = (node: MenuItem) => extractValue(node.label) || ''

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const show = () => {
  open.value = true
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => panelEl.value?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus())
}
const hide = () => {
  open.value = false
  document.body.style.overflow = ''
  triggerEl.value?.focus()
}
const onBackdrop = () => { if (backdropGroup.value.close_on_click !== false) hide() }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open.value) hide() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); if (open.value) document.body.style.overflow = '' })

const side = computed(() => panelGroup.value.side || 'right')
const rootStyle = computed(() => ({
  justifyContent: ({ left: 'flex-start', center: 'center', right: 'flex-end' } as Record<string, string>)[triggerGroup.value.align || 'left'] || 'flex-start'
}))
const drawerStyle = computed(() => ({
  '--oc-width': `${panelGroup.value.width || 380}px`,
  '--oc-bg': resolveColor(panelGroup.value.background) || '#ffffff',
  '--oc-color': resolveColor(panelGroup.value.color) || 'var(--lcms-color-dark, #111827)',
  '--oc-padding': `${panelGroup.value.padding ?? 28}px`,
  '--oc-radius': `${panelGroup.value.radius ?? 0}px`,
  '--oc-backdrop': resolveColor(backdropGroup.value.color) || 'rgba(17, 24, 39, 0.6)',
  '--oc-blur': `${backdropGroup.value.blur ?? 4}px`,
  '--oc-link-size': `${panelGroup.value.link_size || 16}px`,
  '--oc-duration': `${animationGroup.value.duration ?? 350}ms`
}))
const drawerClasses = computed(() => ['lcms-off-canvas__drawer', `oc--side-${side.value}`, `oc--anim-${animationGroup.value.type || 'slide'}`, { 'is-open': open.value }])
</script>

<template>
  <div
    class="lcms-off-canvas"
    :style="rootStyle"
  >
    <button
      ref="triggerEl"
      type="button"
      class="oc-trigger"
      :class="triggerClass"
      :style="triggerStyle"
      :aria-label="triggerText || title || 'Open'"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      @click="show"
    >
      <i
        v-if="iconLeft"
        :class="triggerIcon"
        aria-hidden="true"
      />
      <span v-if="triggerType !== 'icon' && triggerText">{{ triggerText }}</span>
      <i
        v-if="iconRight"
        :class="triggerIcon"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <div
        :class="drawerClasses"
        :style="drawerStyle"
        :aria-hidden="open ? 'false' : 'true'"
      >
        <div
          class="oc-backdrop"
          @click="onBackdrop"
        />
        <div
          ref="panelEl"
          class="oc-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title || triggerText || undefined"
        >
          <div
            v-if="title || showClose"
            class="oc-panel__head"
          >
            <div
              v-if="title"
              class="oc-panel__title"
            >{{ title }}</div>
            <button
              v-if="showClose"
              type="button"
              class="oc-panel__close"
              aria-label="Close"
              @click="hide"
            >×</button>
          </div>
          <nav
            v-if="menuItems.length && menuAbove"
            class="oc-panel__menu"
          >
            <ul>
              <li
                v-for="node in menuItems"
                :key="node.id"
              >
                <a
                  :href="hrefOf(node)"
                  :target="node.metadata?.target || undefined"
                  @click="hide"
                >{{ labelOf(node) }}</a>
                <ul v-if="node.children?.length">
                  <li
                    v-for="child in node.children"
                    :key="child.id"
                  >
                    <a
                      :href="hrefOf(child)"
                      :target="child.metadata?.target || undefined"
                      @click="hide"
                    >{{ labelOf(child) }}</a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
          <div
            v-if="html"
            class="oc-panel__html"
            v-html="html"
          />
          <nav
            v-if="menuItems.length && !menuAbove"
            class="oc-panel__menu"
          >
            <ul>
              <li
                v-for="node in menuItems"
                :key="node.id"
              >
                <a
                  :href="hrefOf(node)"
                  :target="node.metadata?.target || undefined"
                  @click="hide"
                >{{ labelOf(node) }}</a>
                <ul v-if="node.children?.length">
                  <li
                    v-for="child in node.children"
                    :key="child.id"
                  >
                    <a
                      :href="hrefOf(child)"
                      :target="child.metadata?.target || undefined"
                      @click="hide"
                    >{{ labelOf(child) }}</a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </Teleport>
  </div>
</template>
