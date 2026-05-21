<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { countriesFor } from '../../data/countries'

interface Props {
  modelValue: string
  language?: string
  placeholder?: string
  hasError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  language: 'pl',
  placeholder: 'Wybierz kraj',
  hasError: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const options = computed(() => countriesFor(props.language))
const isOpen = ref(false)
const search = ref('')
const highlighted = ref(0)
const rootRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selected = computed(() => options.value.find(o => o.code === props.modelValue) || null)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return options.value
  return options.value.filter(o =>
    o.label.toLowerCase().includes(term) || o.code.toLowerCase().includes(term)
  )
})

function open() {
  if (isOpen.value) return
  isOpen.value = true
  search.value = ''
  highlighted.value = Math.max(0, filtered.value.findIndex(o => o.code === props.modelValue))
  // Focus search after dropdown renders.
  requestAnimationFrame(() => searchInputRef.value?.focus())
}

function close() {
  isOpen.value = false
}

function pick(code: string) {
  emit('update:modelValue', code)
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      open()
    }
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlighted.value = Math.min(filtered.value.length - 1, highlighted.value + 1)
    scrollHighlightedIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlighted.value = Math.max(0, highlighted.value - 1)
    scrollHighlightedIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = filtered.value[highlighted.value]
    if (opt) pick(opt.code)
  }
}

function scrollHighlightedIntoView() {
  const list = rootRef.value?.querySelector('.lcms-country-select__list')
  const item = list?.children?.[highlighted.value] as HTMLElement | undefined
  item?.scrollIntoView({ block: 'nearest' })
}

function handleClickOutside(e: MouseEvent) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) close()
}

watch(search, () => {
  highlighted.value = 0
})

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', handleClickOutside)
  }
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="lcms-country-select"
    :class="{ 'lcms-country-select--open': isOpen, 'lcms-country-select--error': hasError }"
  >
    <button
      type="button"
      class="lcms-country-select__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="isOpen ? close() : open()"
      @keydown="onKeydown"
    >
      <span class="lcms-country-select__label">
        {{ selected?.label || placeholder }}
      </span>
      <span class="lcms-country-select__caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="isOpen" class="lcms-country-select__panel" role="listbox">
      <div class="lcms-country-select__search-wrap">
        <input
          ref="searchInputRef"
          v-model="search"
          type="text"
          class="lcms-country-select__search"
          :placeholder="language === 'en' ? 'Search country…' : 'Szukaj kraju…'"
          @keydown="onKeydown"
        />
      </div>
      <ul v-if="filtered.length > 0" class="lcms-country-select__list">
        <li
          v-for="(opt, idx) in filtered"
          :key="opt.code"
          class="lcms-country-select__option"
          :class="{
            'lcms-country-select__option--selected': opt.code === modelValue,
            'lcms-country-select__option--highlighted': idx === highlighted,
          }"
          role="option"
          :aria-selected="opt.code === modelValue"
          @mousedown.prevent="pick(opt.code)"
          @mouseenter="highlighted = idx"
        >
          <span class="lcms-country-select__label">{{ opt.label }}</span>
          <span class="lcms-country-select__code">{{ opt.code }}</span>
        </li>
      </ul>
      <div v-else class="lcms-country-select__empty">
        {{ language === 'en' ? 'No matches' : 'Brak wyników' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-country-select {
  position: relative;
  font: inherit;
}

.lcms-country-select__trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  background: var(--lcms-color-background, #fff);
  color: inherit;
  border-radius: var(--lcms-border-radius, 0.5rem);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.lcms-country-select__trigger:hover {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-country-select--open .lcms-country-select__trigger,
.lcms-country-select__trigger:focus {
  outline: none;
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 18%, transparent);
}

.lcms-country-select--error .lcms-country-select__trigger {
  border-color: rgb(220, 38, 38);
}

.lcms-country-select__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lcms-country-select__caret {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.75rem;
  transition: transform 0.15s;
}

.lcms-country-select--open .lcms-country-select__caret {
  transform: rotate(180deg);
}

.lcms-country-select__panel {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--lcms-color-background, #fff);
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 320px;
}

.lcms-country-select__search-wrap {
  padding: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-country-select__search {
  width: 100%;
  padding: 0.4375rem 0.625rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  background: var(--lcms-color-background, #fff);
  color: inherit;
  font: inherit;
}

.lcms-country-select__search:focus {
  outline: none;
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 18%, transparent);
}

.lcms-country-select__list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  overflow-y: auto;
}

.lcms-country-select__option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.4375rem 0.625rem;
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  user-select: none;
}

.lcms-country-select__option--highlighted {
  background: color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 8%, transparent);
}

.lcms-country-select__option--selected {
  font-weight: 600;
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-country-select__option--selected::after {
  content: '✓';
  margin-left: auto;
  color: var(--lcms-color-primary, #3b82f6);
  font-weight: 700;
}

.lcms-country-select__code {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  margin-left: auto;
}

.lcms-country-select__option--selected .lcms-country-select__code {
  /* Code hidden behind the ✓ check on the selected row to avoid clutter. */
  display: none;
}

.lcms-country-select__empty {
  padding: 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}
</style>
