import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

interface AnimationConfig {
  type: string
  duration: number
  delay: number
  once: boolean
}

/**
 * Composable for scroll-triggered animations using IntersectionObserver.
 * Tracks visibility of an element and provides reactive state for CSS class toggling.
 */
export function useScrollAnimation(
  elementRef: Ref<HTMLElement | null>,
  config: ComputedRef<AnimationConfig | null>
) {
  const isVisible = ref(false)
  const hasAnimated = ref(false)

  let observer: IntersectionObserver | null = null

  function setupObserver() {
    cleanupObserver()

    const el = elementRef.value
    const cfg = config.value
    if (!el || !cfg || cfg.type === 'none') return

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            isVisible.value = true
            hasAnimated.value = true
            if (cfg.once && observer) {
              observer.unobserve(el)
            }
          } else {
            if (!cfg.once) {
              isVisible.value = false
            }
          }
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
  }

  function cleanupObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onMounted(() => {
    setupObserver()
  })

  watch([elementRef, config], () => {
    setupObserver()
  })

  onUnmounted(() => {
    cleanupObserver()
  })

  return {
    isVisible,
    hasAnimated
  }
}
