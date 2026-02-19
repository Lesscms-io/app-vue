<script setup lang="ts">
/**
 * Block Content Widget
 *
 * Fetches and renders content of a block by its code.
 */

import { computed, ref, onMounted, watch } from 'vue'
import { useApi } from '@/composables/useApi'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const api = useApi()
const blockData = ref<Record<string, any> | null>(null)
const loading = ref(false)

const config = computed(() => props.data.config || props.data || {})
const blockCode = computed(() => config.value.block_code || '')

async function fetchBlock() {
  if (!blockCode.value) return

  loading.value = true
  try {
    const response = await api.get(`/blocks/${blockCode.value}`)
    blockData.value = response.data?.data || response.data || null
  } catch {
    blockData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (blockCode.value) fetchBlock()
})

watch(blockCode, (newCode) => {
  if (newCode) fetchBlock()
})

const blockContent = computed(() => {
  if (!blockData.value) return null
  return blockData.value.content || blockData.value.data || null
})
</script>

<template>
  <div class="lcms-block-content">
    <div v-if="loading" class="lcms-block-content__loading">
      <span class="lcms-block-content__spinner" />
    </div>
    <div
      v-else-if="blockContent"
      class="lcms-block-content__body"
    >
      <!-- Block content is rendered as sections by the parent renderer -->
      <slot :block-data="blockData" :content="blockContent" />
    </div>
  </div>
</template>
