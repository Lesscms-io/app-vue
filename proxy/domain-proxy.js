/**
 * LessCMS Domain Proxy Server
 *
 * Edge-ready proxy that authenticates via custom domain DNS TXT records.
 * No API key needed in environment - it's decrypted from DNS.
 *
 * How it works:
 * 1. User visits https://firma-xyz.pl
 * 2. Proxy reads DNS TXT record: _lcms.firma-xyz.pl
 * 3. TXT record contains encrypted project credentials
 * 4. Proxy decrypts and forwards requests to LessCMS API
 *
 * For development, can also use traditional API key auth.
 *
 * Usage:
 *   ENCRYPTION_KEY=xxx node proxy/domain-proxy.js
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const dns = require('dns').promises
const crypto = require('crypto')

const app = express()

// Configuration
const config = {
    port: process.env.PROXY_PORT || 3001,
    apiBaseUrl: process.env.LESSCMS_API_URL || 'https://api.lesscms.io',
    encryptionKey: process.env.ENCRYPTION_KEY,
    // Fallback for development (traditional mode)
    apiKey: process.env.LESSCMS_API_KEY,
    workspaceCode: process.env.LESSCMS_WORKSPACE,
    projectCode: process.env.LESSCMS_PROJECT,
}

// DNS TXT cache (5 min TTL)
const dnsCache = new Map()
const DNS_CACHE_TTL = 5 * 60 * 1000

// CORS - allow all origins for custom domains
app.use(cors({
    origin: true,
    credentials: true,
}))

app.use(express.json())

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * Get project credentials from DNS TXT record
 */
async function getCredentialsFromDns(hostname) {
    const cacheKey = hostname
    const cached = dnsCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < DNS_CACHE_TTL) {
        return cached.credentials
    }

    try {
        const txtRecordName = `_lcms.${hostname}`
        const records = await dns.resolveTxt(txtRecordName)
        const txtValue = records.map(r => r.join('')).find(v => v.startsWith('v1:'))

        if (!txtValue) {
            throw new Error('No valid LessCMS TXT record found')
        }

        // TXT format: v1:{encrypted_data}
        const encryptedPart = txtValue.substring(3) // Remove 'v1:'

        // For now, the TXT record contains the reference to verify against API
        // The actual project resolution happens in the API via domain auth
        const credentials = {
            domain: hostname,
            txtValue: txtValue,
            usesDomainAuth: true,
        }

        dnsCache.set(cacheKey, {
            credentials,
            timestamp: Date.now(),
        })

        return credentials
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
            throw new Error(`DNS TXT record not found for _lcms.${hostname}`)
        }
        throw error
    }
}

/**
 * Determine request mode and credentials
 */
async function getRequestConfig(req) {
    const hostname = req.hostname || req.headers.host?.split(':')[0]

    // Check if custom domain (not localhost or lesscms domains)
    const isCustomDomain = hostname &&
        hostname !== 'localhost' &&
        !hostname.includes('127.0.0.1') &&
        !hostname.endsWith('.lesscms.app') &&
        !hostname.endsWith('.lesscms.io')

    if (isCustomDomain) {
        // Custom domain mode - use DNS TXT for auth
        const credentials = await getCredentialsFromDns(hostname)
        return {
            mode: 'domain',
            hostname,
            // API will authenticate via domain, no API key needed in header
            // Just send request to /v1/... endpoints (without workspace/project in URL)
            basePath: '/v1',
            headers: {
                'Content-Type': 'application/json',
                // The API's domainAuth middleware will handle authentication
            },
        }
    }

    // Development mode - use traditional API key
    if (!config.apiKey || !config.workspaceCode || !config.projectCode) {
        throw new Error('Development mode requires LESSCMS_API_KEY, LESSCMS_WORKSPACE, and LESSCMS_PROJECT')
    }

    return {
        mode: 'apikey',
        basePath: `/v1/${config.workspaceCode}/${config.projectCode}`,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
        },
    }
}

// Proxy all /api/* requests
app.all('/api/*', async (req, res) => {
    try {
        const requestConfig = await getRequestConfig(req)
        const path = req.params[0] // Everything after /api/

        const targetUrl = `${config.apiBaseUrl}${requestConfig.basePath}/${path}`

        // Build fetch options
        const fetchOptions = {
            method: req.method,
            headers: requestConfig.headers,
        }

        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            fetchOptions.body = JSON.stringify(req.body)
        }

        // Forward query parameters
        const url = new URL(targetUrl)
        Object.entries(req.query).forEach(([key, value]) => {
            url.searchParams.append(key, value)
        })

        // For domain auth, add hostname header so API can verify
        if (requestConfig.mode === 'domain') {
            fetchOptions.headers['X-Forwarded-Host'] = requestConfig.hostname
        }

        // Make request
        const response = await fetch(url.toString(), fetchOptions)

        // Get response
        const contentType = response.headers.get('content-type')
        let body

        if (contentType?.includes('application/json')) {
            body = await response.json()
        } else {
            body = await response.text()
        }

        // Forward cache headers
        const cacheTag = response.headers.get('Cache-Tag')
        if (cacheTag) {
            res.set('Cache-Tag', cacheTag)
        }

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
            message: error.message || 'Failed to connect to LessCMS API',
        })
    }
})

// Clear DNS cache periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of dnsCache) {
        if (now - value.timestamp > DNS_CACHE_TTL) {
            dnsCache.delete(key)
        }
    }
}, DNS_CACHE_TTL)

// Start server
app.listen(config.port, () => {
    console.log(`
🌐 LessCMS Domain Proxy Server running on http://localhost:${config.port}

Modes:
  • Custom Domain: Authenticates via DNS TXT record (_lcms.yourdomain.com)
  • Development:   Uses LESSCMS_API_KEY environment variable

API URL: ${config.apiBaseUrl}
${config.apiKey ? `Dev Mode: ${config.workspaceCode}/${config.projectCode}` : 'Dev Mode: Not configured'}
    `)
})
