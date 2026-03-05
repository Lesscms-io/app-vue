import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const isNavigating = ref(false)
let barElement: HTMLDivElement | null = null
let installed = false

function createBar() {
  if (barElement) return
  barElement = document.createElement('div')
  barElement.className = 'lcms-loading-bar'
  document.body.appendChild(barElement)
}

function removeBar() {
  if (barElement) {
    barElement.remove()
    barElement = null
  }
}

/**
 * Injects a global CSS loading bar and intercepts internal link clicks for SPA navigation.
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

    // Inject loading bar CSS once
    const style = document.createElement('style')
    style.textContent = `
      .lcms-loading-bar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        z-index: 999999;
        background: var(--lcms-color-primary, #50a5f1);
        transform-origin: left;
        animation: lcms-bar-progress 1.2s ease-in-out infinite;
      }
      @keyframes lcms-bar-progress {
        0% { transform: scaleX(0); transform-origin: left; }
        50% { transform: scaleX(0.7); transform-origin: left; }
        100% { transform: scaleX(1); transform-origin: left; }
      }
    `
    document.head.appendChild(style)

    // Router guards for loading bar
    router.beforeEach(() => {
      isNavigating.value = true
      createBar()
    })

    router.afterEach(() => {
      // Small delay so content renders before bar disappears
      setTimeout(() => {
        isNavigating.value = false
        removeBar()
      }, 100)
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
