/**
 * Lightweight toast notification system for ecommerce widgets.
 * No external dependencies — appends a global container to document.body
 * and re-renders on every change via watchEffect.
 */

import { ref, watch, type Ref } from 'vue'

export interface ToastAction {
  label: string
  href: string
}

export interface ToastOptions {
  duration?: number
  /** Renders a call-to-action link inside the toast (e.g. "View cart"). */
  action?: ToastAction
  /** Show a × close button (default: true). */
  closable?: boolean
}

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
  action?: ToastAction
  closable: boolean
}

const toasts = ref<Toast[]>([])
let nextId = 0
let containerEl: HTMLDivElement | null = null
let injectedStyles = false

// Module-level so the container's render watch (below) can wire close
// buttons to it, not just the useToast() instance.
function dismiss(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

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
      display: flex;
      align-items: center;
      gap: 0.75rem;
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
    .lcms-toast__msg { flex: 1; min-width: 0; }
    .lcms-toast__action {
      flex-shrink: 0;
      color: white;
      font-weight: 700;
      text-decoration: underline;
      white-space: nowrap;
    }
    .lcms-toast__action:hover { opacity: 0.85; }
    .lcms-toast__close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: white;
      opacity: 0.85;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 1.25rem;
      height: 1.25rem;
    }
    .lcms-toast__close:hover { opacity: 1; }
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

      const msg = document.createElement('span')
      msg.className = 'lcms-toast__msg'
      msg.textContent = toast.message
      el.appendChild(msg)

      // Optional CTA (e.g. "Zobacz koszyk →") — an anchor so it works
      // without any router wiring.
      if (toast.action) {
        const link = document.createElement('a')
        link.className = 'lcms-toast__action'
        link.href = toast.action.href
        link.textContent = toast.action.label
        el.appendChild(link)
      }

      // Close button — lets the user dismiss a toast that's covering the
      // cart icon / page chrome instead of waiting it out.
      if (toast.closable) {
        const close = document.createElement('button')
        close.type = 'button'
        close.className = 'lcms-toast__close'
        close.setAttribute('aria-label', 'Close')
        close.textContent = '×'
        close.addEventListener('click', () => dismiss(toast.id))
        el.appendChild(close)
      }

      containerEl.appendChild(el)
    }
  }, { deep: true })
}

export interface ToastApi {
  toasts: Ref<Toast[]>
  success(message: string, opts?: number | ToastOptions): void
  error(message: string, opts?: number | ToastOptions): void
  info(message: string, opts?: number | ToastOptions): void
  warning(message: string, opts?: number | ToastOptions): void
  dismiss(id: number): void
  clear(): void
}

export function useToast(): ToastApi {
  ensureContainer()

  // Second arg stays backward-compatible: a number = duration (ms), an
  // object = full options (duration + optional action + closable).
  function show(message: string, type: Toast['type'], arg?: number | ToastOptions) {
    const opts: ToastOptions = typeof arg === 'number' ? { duration: arg } : (arg || {})
    const duration = opts.duration ?? 3000
    const id = ++nextId
    toasts.value = [...toasts.value, {
      id, message, type, duration,
      action: opts.action,
      closable: opts.closable ?? true,
    }]
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }

  function clear() {
    toasts.value = []
  }

  return {
    toasts,
    success: (message, arg) => show(message, 'success', arg),
    error: (message, arg) => show(message, 'error', arg),
    info: (message, arg) => show(message, 'info', arg),
    warning: (message, arg) => show(message, 'warning', arg),
    dismiss,
    clear,
  }
}
