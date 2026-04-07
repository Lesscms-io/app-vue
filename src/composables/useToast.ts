/**
 * Lightweight toast notification system for ecommerce widgets.
 * No external dependencies — appends a global container to document.body
 * and re-renders on every change via watchEffect.
 */

import { ref, watch, type Ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 0
let containerEl: HTMLDivElement | null = null
let injectedStyles = false

function injectStyles() {
  if (injectedStyles || typeof document === 'undefined') return
  injectedStyles = true

  const style = document.createElement('style')
  style.textContent = `
    .lcms-toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 24rem;
      pointer-events: none;
    }
    .lcms-toast {
      padding: 0.875rem 1.125rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: var(--lcms-font-body, system-ui, sans-serif);
      font-size: 0.875rem;
      line-height: 1.4;
      color: white;
      pointer-events: auto;
      animation: lcms-toast-in 0.2s ease-out;
      max-width: 24rem;
    }
    .lcms-toast--success { background: var(--lcms-color-success, #10b981); }
    .lcms-toast--error { background: var(--lcms-color-danger, #ef4444); }
    .lcms-toast--info { background: var(--lcms-color-info, #3b82f6); }
    .lcms-toast--warning { background: var(--lcms-color-warning, #f59e0b); }
    @keyframes lcms-toast-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

function ensureContainer() {
  if (containerEl || typeof document === 'undefined') return
  injectStyles()

  containerEl = document.createElement('div')
  containerEl.className = 'lcms-toast-container'
  containerEl.id = 'lcms-toast-container'
  document.body.appendChild(containerEl)

  // Render via Vue reactivity (watch)
  watch(toasts, (current) => {
    if (!containerEl) return
    containerEl.innerHTML = ''
    for (const toast of current) {
      const el = document.createElement('div')
      el.className = `lcms-toast lcms-toast--${toast.type}`
      el.textContent = toast.message
      containerEl.appendChild(el)
    }
  }, { deep: true })
}

export interface ToastApi {
  toasts: Ref<Toast[]>
  success(message: string, duration?: number): void
  error(message: string, duration?: number): void
  info(message: string, duration?: number): void
  warning(message: string, duration?: number): void
  dismiss(id: number): void
  clear(): void
}

export function useToast(): ToastApi {
  ensureContainer()

  function show(message: string, type: Toast['type'], duration: number = 3000) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, type, duration }]
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  return {
    toasts,
    success: (message, duration) => show(message, 'success', duration),
    error: (message, duration) => show(message, 'error', duration),
    info: (message, duration) => show(message, 'info', duration),
    warning: (message, duration) => show(message, 'warning', duration),
    dismiss,
    clear,
  }
}
