import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const isNavigating = ref(false)
let loaderElement: HTMLDivElement | null = null
let loaderTimeout: ReturnType<typeof setTimeout> | null = null
let installed = false

function showLoader() {
  // Only show loader after 300ms delay — fast loads won't flash it at all
  loaderTimeout = setTimeout(() => {
    if (loaderElement) return
    loaderElement = document.createElement('div')
    loaderElement.className = 'lcms-page-loader'
    loaderElement.innerHTML = '<div class="lcms-page-loader__spinner"></div>'
    document.body.appendChild(loaderElement)
  }, 300)
}

function hideLoader() {
  if (loaderTimeout) {
    clearTimeout(loaderTimeout)
    loaderTimeout = null
  }
  if (loaderElement) {
    loaderElement.remove()
    loaderElement = null
  }
}

/**
 * Intercepts internal link clicks for SPA navigation and shows a centered
 * loader spinner during page transitions (only if loading takes > 300ms).
 * Call once in your root layout/provider component.
 */
export function usePageTransition() {
  const router = useRouter()

  function handleLinkClick(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href) return

    // Skip external, anchors, mailto, tel, javascript
    if (/^(https?:\/\/|\/\/|mailto:|tel:|#|javascript:)/.test(href)) return
    if (anchor.target === '_blank') return
    if (anchor.hasAttribute('download')) return

    // Internal link — SPA navigate
    e.preventDefault()
    router.push(href)
  }

  // Install only once (multiple components might call this)
  if (!installed) {
    installed = true

    // Inject loader CSS once
    const style = document.createElement('style')
    style.textContent = `
      .lcms-page-loader {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.6);
        animation: lcms-loader-fade-in 0.2s ease-out;
      }
      .lcms-page-loader__spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(0, 0, 0, 0.08);
        border-top-color: var(--lcms-color-primary, #50a5f1);
        border-radius: 50%;
        animation: lcms-loader-spin 0.7s linear infinite;
      }
      @keyframes lcms-loader-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes lcms-loader-spin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    // Router guards
    router.beforeEach(() => {
      isNavigating.value = true
      showLoader()
    })

    router.afterEach(() => {
      isNavigating.value = false
      hideLoader()
    })
  }

  onMounted(() => {
    document.addEventListener('click', handleLinkClick)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleLinkClick)
  })

  return { isNavigating }
}
