import { headers } from "next/headers"
import { env } from '@/env'
import { serverAuth } from "@/lib/client/auth"
// TODO: add withProxy and LoggingHook back in
// import { withProxy, LoggingHook } from 'mcpay/handler'

// Helper function to validate and extract origin
function getValidOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Extract origin from referer if origin header is missing
  const extractedOrigin = origin || (referer ? new URL(referer).origin : null)
  
  // In production, only allow specific domains
  if (env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'https://v2.mcpay.tech',
      'https://mcpay.tech',
      'https://www.mcpay.tech',
    ]
    
    if (extractedOrigin && allowedOrigins.includes(extractedOrigin)) {
      return extractedOrigin
    }
    
    return null
  }
  
  // In development, allow localhost and local IPs
  if (extractedOrigin && (
    extractedOrigin.startsWith('http://localhost:') ||
    extractedOrigin.startsWith('http://127.0.0.1:') ||
    extractedOrigin.startsWith('https://localhost:') ||
    extractedOrigin.startsWith('https://127.0.0.1:')
  )) {
    return extractedOrigin
  }
  
  return extractedOrigin
}

export async function POST(request: Request) {
  const h = await headers()
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('target-url')

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: h.get('cookie') ?? '',
      },
      credentials: 'include',
    },
  })

  if (!session.data) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!targetUrl) {
    return new Response("target-url parameter is required", { status: 400 })
  }

  // Ensure targetUrl is base64-encoded (it should be when coming from query params)
  // If it's already a URL, encode it. Otherwise, assume it's already base64.
  let base64TargetUrl = targetUrl
  try {
    // Try to decode it - if it works, it's base64. If not, maybe it's already a URL?
    const decoded = atob(targetUrl)
    // If decoding worked, check if it's a valid URL
    try {
      new URL(decoded)
      // It's valid base64 that decodes to a URL, use it as-is
      base64TargetUrl = targetUrl
    } catch {
      // Not a URL, maybe it's already decoded? Re-encode it
      base64TargetUrl = btoa(targetUrl)
    }
  } catch {
    // Not valid base64, try encoding it
    try {
      base64TargetUrl = btoa(targetUrl)
    } catch (e) {
      console.error('Failed to encode targetUrl:', e)
      return new Response("Invalid target-url parameter", { status: 400 })
    }
  }

  console.log('targetUrl (original):', targetUrl.substring(0, 50))
  console.log('base64TargetUrl:', base64TargetUrl.substring(0, 50))
  console.log('targetUrl length:', targetUrl?.length)
  console.log('Incoming cookies:', h.get('cookie'))
  console.log('Request origin:', request.headers.get('origin'))
  console.log('Request referer:', request.headers.get('referer'))

  // Use the local MCP server instead of external proxy
  // Pass target-url as both header (preferred) and query param (fallback) to ensure it's received
  const mcpUrl = `${env.NEXT_PUBLIC_AUTH_URL}/mcp?target-url=${encodeURIComponent(base64TargetUrl)}`

  console.log('mcpUrl', mcpUrl)
  
  // Forward the request to the local MCP server with original headers (preserve MCP session headers)
  const forwardHeaders = new Headers()
  // Copy all incoming headers except hop-by-hop ones
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'host' || lower === 'connection' || lower === 'content-length' || lower === 'transfer-encoding' || lower === 'content-encoding') {
      return
    }
    forwardHeaders.set(key, value)
  })
  // Pass target-url as header (base64-encoded) - this is what the MCP server expects
  forwardHeaders.set('x-mcpay-target-url', base64TargetUrl)
  console.log('Setting x-mcpay-target-url header:', base64TargetUrl.substring(0, 50) + '...')
  // Ensure cookies are forwarded from Next headers API
  if (h.get('cookie')) {
    forwardHeaders.set('Cookie', h.get('cookie') || '')
  }
  // Ensure Accept header supports streaming
  if (!forwardHeaders.has('Accept')) {
    forwardHeaders.set('Accept', 'application/json, text/event-stream')
  }
  // Default content-type for JSON-RPC
  if (!forwardHeaders.has('Content-Type')) {
    forwardHeaders.set('Content-Type', 'application/json')
  }

  // Read body once to check if it's an initialize request and reuse for forwarding
  let bodyText: string | null = null
  let isInitializeRequest = false
  try {
    bodyText = await request.text()
    if (bodyText) {
      const bodyJson = JSON.parse(bodyText)
      isInitializeRequest = bodyJson?.method === 'initialize'
    }
  } catch {
    // If parsing fails, assume it's not initialize (will add session ID)
  }

  // Generate new MCP session ID if missing, but NOT for initialize requests
  if (!isInitializeRequest && !forwardHeaders.has('MCP-Session-Id') && !forwardHeaders.has('mcp-session-id')) {
    const newSessionId = crypto.randomUUID()
    forwardHeaders.set('MCP-Session-Id', newSessionId)
  } else if (isInitializeRequest) {
    // Remove session ID header for initialize requests
    forwardHeaders.delete('MCP-Session-Id')
    forwardHeaders.delete('mcp-session-id')
  }

  const targetUrlHeaderValue = forwardHeaders.get('x-mcpay-target-url')
  console.log('Forwarding to MCP server with headers:', {
    'x-mcpay-target-url': targetUrlHeaderValue ? (targetUrlHeaderValue.substring(0, 50) + '... (full length: ' + targetUrlHeaderValue.length + ')') : 'MISSING',
    'content-type': forwardHeaders.get('content-type'),
    'authorization': forwardHeaders.get('authorization') ? 'present' : 'missing',
    'all-headers': Array.from(forwardHeaders.entries()).map(([k, v]) => [k, k === 'x-mcpay-target-url' ? v.substring(0, 30) + '...' : v.substring(0, 30)]),
  })

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: forwardHeaders,
    body: bodyText ?? '',
    credentials: 'include',
  })

  console.log('MCP server response status:', response.status, response.statusText)

  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  const upstreamSessionId = response.headers.get('MCP-Session-Id') || response.headers.get('mcp-session-id') || ''
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider, MCP-Session-Id, mcp-session-id, x-api-key, WWW-Authenticate',
      'Access-Control-Expose-Headers': 'MCP-Session-Id, WWW-Authenticate',
      ...(upstreamSessionId ? { 'MCP-Session-Id': upstreamSessionId } : {}),
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
    },
  })
}

export async function GET(request: Request) {
  const h = await headers()
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('target-url')

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: h.get('cookie') ?? '',
      },
      credentials: 'include',
    },
  })

  if (!session.data) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  if (!targetUrl) {
    return new Response("target-url parameter is required", { status: 400 })
  }

  // Ensure targetUrl is base64-encoded (same logic as POST)
  let base64TargetUrl = targetUrl
  try {
    const decoded = atob(targetUrl)
    try {
      new URL(decoded)
      base64TargetUrl = targetUrl
    } catch {
      base64TargetUrl = btoa(targetUrl)
    }
  } catch {
    try {
      base64TargetUrl = btoa(targetUrl)
    } catch (e) {
      return new Response("Invalid target-url parameter", { status: 400 })
    }
  }

  // Use the local MCP server instead of external proxy
  // Pass target-url as both header (preferred) and query param (fallback) to ensure it's received
  const mcpUrl = `${env.NEXT_PUBLIC_AUTH_URL}/mcp?target-url=${encodeURIComponent(base64TargetUrl)}`
  
  // Forward the request to the local MCP server with original headers (preserve MCP session headers)
  const forwardHeaders = new Headers()
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'host' || lower === 'connection' || lower === 'content-length' || lower === 'transfer-encoding' || lower === 'content-encoding') {
      return
    }
    forwardHeaders.set(key, value)
  })
  // Pass target-url as header (base64-encoded) - this is what the MCP server expects
  forwardHeaders.set('x-mcpay-target-url', base64TargetUrl)
  if (h.get('cookie')) {
    forwardHeaders.set('Cookie', h.get('cookie') || '')
  }
  if (!forwardHeaders.has('Accept')) {
    forwardHeaders.set('Accept', 'application/json, text/event-stream')
  }

  // Generate new MCP session ID if missing
  if (!forwardHeaders.has('MCP-Session-Id') && !forwardHeaders.has('mcp-session-id')) {
    const newSessionId = crypto.randomUUID()
    forwardHeaders.set('MCP-Session-Id', newSessionId)
  }

  const response = await fetch(mcpUrl, {
    method: 'GET',
    headers: forwardHeaders,
    credentials: 'include',
    // @ts-expect-error this is valid and needed
    duplex: 'half',
  })

  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  const upstreamSessionId = response.headers.get('MCP-Session-Id') || response.headers.get('mcp-session-id') || ''
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider, MCP-Session-Id, mcp-session-id, x-api-key, WWW-Authenticate',
      'Access-Control-Expose-Headers': 'MCP-Session-Id, WWW-Authenticate',
      ...(upstreamSessionId ? { 'MCP-Session-Id': upstreamSessionId } : {}),
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
    },
  })
}

export async function OPTIONS(request: Request) {
  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json, text/event-stream',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider, MCP-Session-Id, mcp-session-id, x-api-key, WWW-Authenticate',
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
    },
  })
}
