<script setup lang="ts">
/**
 * LessCMS Universal Frontend Demo
 *
 * Works out of the box - just configure .env and go!
 */

import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { LessCMSProvider } from '../src'

// Get config from environment variables
const config = computed(() => ({
  baseUrl: import.meta.env.VITE_LESSCMS_API_URL || 'https://api.lesscms.io',
  apiKey: import.meta.env.VITE_LESSCMS_API_KEY || '',
  workspaceCode: import.meta.env.VITE_LESSCMS_WORKSPACE || '',
  projectCode: import.meta.env.VITE_LESSCMS_PROJECT || '',
  defaultLanguage: import.meta.env.VITE_LESSCMS_LANGUAGE || 'pl',
}))

const isConfigured = computed(() => {
  return config.value.apiKey && config.value.workspaceCode && config.value.projectCode
})
</script>

<template>
  <div class="lcms-app">
    <!-- Not configured - show setup instructions -->
    <div
      v-if="!isConfigured"
      class="lcms-setup"
    >
      <div class="lcms-setup__box">
        <h1>LessCMS Frontend</h1>
        <p>Configure your .env file to get started:</p>
        <pre class="lcms-setup__code">
# .env
VITE_LESSCMS_API_URL=https://api.lesscms.io
VITE_LESSCMS_API_KEY=your-api-key
VITE_LESSCMS_WORKSPACE=your-workspace
VITE_LESSCMS_PROJECT=your-project
VITE_LESSCMS_LANGUAGE=pl</pre>
        <p class="lcms-setup__hint">
          Get your API key from the LessCMS dashboard.
        </p>
      </div>
    </div>

    <!-- Configured - render the app -->
    <LessCMSProvider
      v-else
      :base-url="config.baseUrl"
      :api-key="config.apiKey"
      :workspace-code="config.workspaceCode"
      :project-code="config.projectCode"
      :default-language="config.defaultLanguage"
    >
      <RouterView />
    </LessCMSProvider>
  </div>
</template>

<style>
/* Setup screen styles */
.lcms-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.lcms-setup__box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.lcms-setup__box h1 {
  margin: 0 0 16px;
  font-size: 28px;
  color: #333;
}

.lcms-setup__box p {
  margin: 0 0 16px;
  color: #666;
}

.lcms-setup__code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.lcms-setup__hint {
  margin-top: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-left: 4px solid #50a5f1;
  border-radius: 4px;
  color: #0369a1;
  font-size: 14px;
}
</style>
