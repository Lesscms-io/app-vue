/**
 * LessCMS API Proxy Server
 *
 * Hides the API key from browser by proxying requests server-side.
 * The API key is stored in environment variables, not exposed to client.
 *
 * Usage:
 *   LESSCMS_API_KEY=xxx LESSCMS_WORKSPACE=my-ws LESSCMS_PROJECT=my-proj node proxy/server.js
 *
 * Or with .env file:
 *   node proxy/server.js
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()

// Configuration from environment
const config = {
  port: process.env.PROXY_PORT || 3001,
  apiBaseUrl: process.env.LESSCMS_API_URL || 'https://api.lesscms.io',
  apiKey: process.env.LESSCMS_API_KEY,
  workspaceCode: process.env.LESSCMS_WORKSPACE,
  projectCode: process.env.LESSCMS_PROJECT,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
}

// Validate required config
if (!config.apiKey) {
  console.error('❌ LESSCMS_API_KEY environment variable is required')
  process.exit(1)
}

if (!config.workspaceCode || !config.projectCode) {
  console.error('❌ LESSCMS_WORKSPACE and LESSCMS_PROJECT environment variables are required')
  process.exit(1)
}

// CORS configuration
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}))

// Parse JSON bodies
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Proxy all /api/* requests to LessCMS API
app.all('/api/*', async (req, res) => {
  const path = req.params[0] // Everything after /api/
  const targetUrl = `${config.apiBaseUrl}/v1/${config.workspaceCode}/${config.projectCode}/${path}`

  try {
    // Build fetch options
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    }

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    // Forward query parameters
    const url = new URL(targetUrl)
    Object.entries(req.query).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    // Make request to LessCMS API
    const response = await fetch(url.toString(), fetchOptions)

    // Get response body
    const contentType = response.headers.get('content-type')
    let body

    if (contentType?.includes('application/json')) {
      body = await response.json()
    } else {
      body = await response.text()
    }

    // Forward cache headers if present
    const cacheTag = response.headers.get('Cache-Tag')
    if (cacheTag) {
      res.set('Cache-Tag', cacheTag)
    }

    // Return response
    res.status(response.status)

    if (typeof body === 'object') {
      res.json(body)
    } else {
      res.send(body)
    }
  } catch (error) {
    console.error('Proxy error:', error.message)
    res.status(502).json({
      error: 'Proxy error',
      message: 'Failed to connect to LessCMS API',
    })
  }
})

// Start server
app.listen(config.port, () => {
  console.log(`
🔐 LessCMS Proxy Server running on http://localhost:${config.port}

Configuration:
  API URL:    ${config.apiBaseUrl}
  Workspace:  ${config.workspaceCode}
  Project:    ${config.projectCode}
  Origins:    ${config.allowedOrigins.join(', ')}

The API key is stored server-side and never exposed to the browser.
  `)
})
