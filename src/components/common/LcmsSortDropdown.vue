<script setup lang="ts">
/**
 * Własny dropdown sortowania (zamiast natywnego <select>): przycisk + popover
 * z listą opcji. role=listbox/option, klawiatura (↑↓ Home End Enter Esc),
 * zamykanie klikiem poza. Na wąskim ekranie lista wyjeżdża od dołu (bottom sheet).
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

interface Option { value: string; label: string }

const props = defineProps<{
  modelValue: string
  options: Option[]
  label?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const uid = `lcms-sort-${Math.random().toString(36).slice(2, 9)}`
const open = ref(false)
const active = ref(0)
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)

const selectedIndex = computed(() => Math.max(0, props.options.findIndex((o) => o.value === props.modelValue)))
const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? '')

function onDocPointer(e: Event) {
  if (root.value && !root.value.contains(e.target as Node)) close(false)
}

function show() {
  if (open.value) return
  open.value = true
  active.value = selectedIndex.value
  document.addEventListener('pointerdown', onDocPointer, true)
  nextTick(() => list.value?.focus())
}

function close(refocus = true) {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onDocPointer, true)
  if (refocus) nextTick(() => button.value?.focus())
}

function choose(i: number) {
  const opt = props.options[i]
  if (opt && opt.value !== props.modelValue) emit('update:modelValue', opt.value)
  close()
}

function onButtonKey(e: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    show()
  }
}

function onListKey(e: KeyboardEvent) {
  const last = props.options.length - 1
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); active.value = Math.min(last, active.value + 1); break
    case 'ArrowUp': e.preventDefault(); active.value = Math.max(0, active.value - 1); break
    case 'Home': e.preventDefault(); active.value = 0; break
    case 'End': e.preventDefault(); active.value = last; break
    case 'Enter':
    case ' ': e.preventDefault(); choose(active.value); break
    case 'Escape': e.preventDefault(); close(); break
    case 'Tab': close(false); break
  }
}

watch(active, (i) => {
  nextTick(() => list.value?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' }))
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer, true))
</script>

<template>
  <div
    ref="root"
    class="lcms-sort"
    :class="{ 'is-open': open }"
  >
    <span
      v-if="label"
      :id="`${uid}-label`"
      class="lcms-sort__label"
    >{{ label }}</span>
    <button
      ref="button"
      type="button"
      class="lcms-sort__button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-labelledby="label ? `${uid}-label ${uid}-value` : `${uid}-value`"
      @click="open ? close() : show()"
      @keydown="onButtonKey"
    >
      <span :id="`${uid}-value`">{{ selectedLabel }}</span>
      <svg
        class="lcms-sort__chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      ><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div
      v-if="open"
      class="lcms-sort__backdrop"
      @click="close()"
    />
    <ul
      v-if="open"
      ref="list"
      class="lcms-sort__list"
      role="listbox"
      tabindex="-1"
      :aria-labelledby="label ? `${uid}-label` : undefined"
      :aria-activedescendant="`${uid}-opt-${active}`"
      @keydown="onListKey"
    >
      <li
        v-for="(opt, i) in options"
        :id="`${uid}-opt-${i}`"
        :key="opt.value"
        :data-index="i"
        role="option"
        class="lcms-sort__option"
        :class="{ 'is-active': i === active, 'is-selected': i === selectedIndex }"
        :aria-selected="i === selectedIndex"
        @click="choose(i)"
        @mousemove="active = i"
      >
        <span>{{ opt.label }}</span>
        <svg
          v-if="i === selectedIndex"
          class="lcms-sort__check"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        ><path d="M20 6 9 17l-5-5" /></svg>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lcms-sort {
  --sort-primary: var(--lcms-color-primary, #2563eb);
  --sort-border: var(--lcms-border-color, #e5e7eb);
  --sort-bg: var(--lcms-color-background, #fff);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}
.lcms-sort__label { color: var(--lcms-muted-color, #6b7280); white-space: nowrap; }
.lcms-sort__button {
  display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
  height: 40px; min-width: 170px; padding: 0 14px; border: 1px solid var(--sort-border); border-radius: 10px;
  background: var(--sort-bg); color: inherit; font: inherit; font-weight: 500; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lcms-sort__button:hover,
.lcms-sort.is-open .lcms-sort__button { border-color: var(--sort-primary); }
.lcms-sort__button:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--sort-primary) 22%, transparent); }
.lcms-sort__chevron { flex: 0 0 auto; color: var(--lcms-muted-color, #6b7280); transition: transform 0.2s; }
.lcms-sort.is-open .lcms-sort__chevron { transform: rotate(180deg); }
.lcms-sort__backdrop { display: none; }
.lcms-sort__list {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 50; min-width: 100%; width: max-content; max-width: 280px;
  margin: 0; padding: 6px; list-style: none; background: var(--sort-bg); border: 1px solid var(--sort-border);
  border-radius: 12px; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14); outline: none;
  animation: lcms-sort-in 0.14s ease-out;
}
.lcms-sort__option {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 9px 12px; border-radius: 8px; cursor: pointer; white-space: nowrap;
}
.lcms-sort__option.is-active { background: color-mix(in srgb, var(--sort-primary) 9%, var(--sort-bg)); }
.lcms-sort__option.is-selected { color: var(--sort-primary); font-weight: 600; }
.lcms-sort__check { flex: 0 0 auto; color: var(--sort-primary); }
@keyframes lcms-sort-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

@media (max-width: 640px) {
  .lcms-sort__backdrop { display: block; position: fixed; inset: 0; z-index: 999; background: rgba(0, 0, 0, 0.35); }
  .lcms-sort__list {
    position: fixed; top: auto; left: 0; right: 0; bottom: 0; z-index: 1000; width: auto; max-width: none;
    padding: 10px 10px calc(14px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; border: 0;
    animation: lcms-sort-sheet 0.2s ease-out;
  }
  .lcms-sort__option { padding: 14px 16px; font-size: 1rem; }
  @keyframes lcms-sort-sheet { from { transform: translateY(100%); } to { transform: none; } }
}
</style>
