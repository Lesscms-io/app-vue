<script setup lang="ts">
/**
 * Cookie Consent Widget
 *
 * Renders a cookie consent banner with accept/decline buttons.
 * Uses localStorage to remember user's choice.
 */

import { ref, computed, onMounted } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const STORAGE_KEY = 'lcms-cookie-consent'

const isVisible = ref(false)

// API returns widget data in data.widget
const config = computed(() => props.data.widget || props.data || {})

const message = computed(() => extractValue(config.value.message) || '')
const acceptText = computed(() => extractValue(config.value.accept_text) || 'OK')
const declineText = computed(() => extractValue(config.value.decline_text) || '')
const showDecline = computed(() => config.value.show_decline === true)
const policyUrl = computed(() => config.value.policy_url || '')
const policyLinkText = computed(() => extractValue(config.value.policy_link_text) || '')
const position = computed(() => config.value.position || 'bottom')
const cookieStyle = computed(() => config.value.cookie_style || config.value.style || 'bar')
const daysToExpire = computed(() => config.value.days_to_expire || 365)

const bgColor = computed(() => config.value.background_color ? resolveColor(config.value.background_color) : '')
const textColor = computed(() => config.value.text_color ? resolveColor(config.value.text_color) : '')
const acceptBgColor = computed(() => config.value.accept_bg_color ? resolveColor(config.value.accept_bg_color) : '')
const acceptTextColor = computed(() => config.value.accept_text_color ? resolveColor(config.value.accept_text_color) : '')

const containerStyles = computed(() => {
  const s: Record<string, string> = {}
  if (bgColor.value) s.backgroundColor = bgColor.value
  if (textColor.value) s.color = textColor.value
  return s
})

const acceptBtnStyles = computed(() => {
  const s: Record<string, string> = {}
  if (acceptBgColor.value) s.backgroundColor = acceptBgColor.value
  if (acceptTextColor.value) s.color = acceptTextColor.value
  return s
})

function getStoredConsent(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (parsed.expires && new Date(parsed.expires) < new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed.value
  } catch {
    return null
  }
}

function storeConsent(value: string) {
  const expires = new Date()
  expires.setDate(expires.getDate() + daysToExpire.value)
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, expires: expires.toISOString() }))
}

function accept() {
  storeConsent('accepted')
  isVisible.value = false
}

function decline() {
  storeConsent('declined')
  isVisible.value = false
}

onMounted(() => {
  const consent = getStoredConsent()
  if (!consent) {
    isVisible.value = true
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lcms-cookie-consent">
      <div
        v-if="isVisible"
        class="lcms-cookie-consent"
        :class="[
          `lcms-cookie-consent--${position}`,
          `lcms-cookie-consent--${cookieStyle}`
        ]"
        :style="containerStyles"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div class="lcms-cookie-consent__body">
          <div
            v-if="message"
            class="lcms-cookie-consent__message"
            v-html="message"
          />

          <a
            v-if="policyUrl && policyLinkText"
            :href="policyUrl"
            class="lcms-cookie-consent__policy-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ policyLinkText }}
          </a>
        </div>

        <div class="lcms-cookie-consent__actions">
          <button
            class="lcms-cookie-consent__btn lcms-cookie-consent__btn--accept"
            :style="acceptBtnStyles"
            @click="accept"
          >
            {{ acceptText }}
          </button>

          <button
            v-if="showDecline && declineText"
            class="lcms-cookie-consent__btn lcms-cookie-consent__btn--decline"
            @click="decline"
          >
            {{ declineText }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lcms-cookie-consent {
  position: fixed;
  z-index: 9999;
  font-family: var(--lcms-font-body, inherit);
  font-size: var(--lcms-font-size-base, 14px);
  background-color: #1a1a2e;
  color: #e0e0e0;
  padding: 16px 24px;
  box-sizing: border-box;
}

/* Positions */
.lcms-cookie-consent--bottom {
  bottom: 0;
  left: 0;
  right: 0;
}

.lcms-cookie-consent--top {
  top: 0;
  left: 0;
  right: 0;
}

.lcms-cookie-consent--bottom-left {
  bottom: 20px;
  left: 20px;
  max-width: 420px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.lcms-cookie-consent--bottom-right {
  bottom: 20px;
  right: 20px;
  max-width: 420px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

/* Styles */
.lcms-cookie-consent--bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.lcms-cookie-consent--box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lcms-cookie-consent--minimal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 20px;
  font-size: 13px;
}

/* Body */
.lcms-cookie-consent__body {
  flex: 1;
  min-width: 0;
}

.lcms-cookie-consent__message {
  line-height: 1.5;
}

.lcms-cookie-consent__message :deep(p) {
  margin: 0;
}

.lcms-cookie-consent__policy-link {
  color: inherit;
  opacity: 0.8;
  text-decoration: underline;
  font-size: 0.9em;
  margin-top: 4px;
  display: inline-block;
}

.lcms-cookie-consent__policy-link:hover {
  opacity: 1;
}

/* Actions */
.lcms-cookie-consent__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}

.lcms-cookie-consent__btn {
  border: none;
  cursor: pointer;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: inherit;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.2s;
  font-family: inherit;
}

.lcms-cookie-consent__btn:hover {
  opacity: 0.85;
}

.lcms-cookie-consent__btn--accept {
  background-color: var(--lcms-color-primary, #4f46e5);
  color: #fff;
}

.lcms-cookie-consent__btn--decline {
  background: transparent;
  color: inherit;
  opacity: 0.7;
  border: 1px solid currentColor;
}

.lcms-cookie-consent__btn--decline:hover {
  opacity: 1;
}

/* Transitions */
.lcms-cookie-consent-enter-active,
.lcms-cookie-consent-leave-active {
  transition: transform 0.4s ease, opacity 0.4s ease;
}

.lcms-cookie-consent--bottom.lcms-cookie-consent-enter-from,
.lcms-cookie-consent--bottom.lcms-cookie-consent-leave-to,
.lcms-cookie-consent--bottom-left.lcms-cookie-consent-enter-from,
.lcms-cookie-consent--bottom-left.lcms-cookie-consent-leave-to,
.lcms-cookie-consent--bottom-right.lcms-cookie-consent-enter-from,
.lcms-cookie-consent--bottom-right.lcms-cookie-consent-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.lcms-cookie-consent--top.lcms-cookie-consent-enter-from,
.lcms-cookie-consent--top.lcms-cookie-consent-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .lcms-cookie-consent--bar {
    flex-direction: column;
    text-align: center;
  }

  .lcms-cookie-consent--bottom-left,
  .lcms-cookie-consent--bottom-right {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
  }

  .lcms-cookie-consent__actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
