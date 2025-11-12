"use client"

import type React from "react"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import HighlighterText from "@/components/custom-ui/highlighter-text"
import { cn } from "@/lib/utils"
import { mcpDataApi, api as realApi, urlUtils } from "@/lib/client/utils"
import { usePrimaryWallet } from "@/components/providers/user"
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types"
import { type Network } from "@/types/blockchain"
import { AlertCircle, ArrowUpRight, CircleCheck, Clipboard, Info, Loader2, Server, Trash2, FlaskConical } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
const MonetizeWizard = dynamic(() => import("@/components/custom-ui/monetize-wizard").then(m => ({ default: m.MonetizeWizard })), { ssr: false })





// Helper function to extract a display name from a URL
const generateDisplayNameFromUrl = (urlStr: string): string => {
  try {
    const url = new URL(urlStr)
    let path = url.pathname
    if (path.startsWith("/")) path = path.substring(1)
    if (path.endsWith("/")) path = path.substring(0, path.length - 1)

    // Replace common repository hosting prefixes or suffixes if any
    path = path.replace(/^github\.com\//i, '').replace(/^gitlab\.com\//i, '').replace(/^bitbucket\.org\//i, '')
    path = path.replace(/\.git$/i, '')

    if (!path && url.hostname) { // If path is empty, use hostname
      path = url.hostname;
    }

    return path
      .split(/[\/\-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Unknown Source"
  } catch {
    return "Unknown Source"
  }
}

// Local types and API with mocked fallbacks
type RegisterMCPTool = {
  name: string
  description?: string
  price?: string
}

type PricingEntry = {
  maxAmountRequiredRaw: string
  assetAddress: string
  network: Network | string
  active?: boolean
  tokenDecimals: number
}


// Create a thin wrapper around the real API with graceful mock fallbacks
const api = {
  async registerServer(_data: {
    mcpOrigin: string
    receiverAddress: string
    name?: string
    description?: string
    requireAuth?: boolean
    authHeaders?: Record<string, unknown>
    tools?: Array<{ name: string; pricing: PricingEntry[] }>
    walletInfo?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<{ serverId: string }> {
    // Fully mocked for now to keep UI functional without backend
    return { serverId: 'mock_server_' + Math.random().toString(36).slice(2, 10) }
  },

  async getMcpTools(url: string): Promise<RegisterMCPTool[]> {
    // First, try our local API route for inspection
    try {
      const res = await fetch(`/api/inspect-mcp-server?url=${encodeURIComponent(url)}&include=tools`)
      if (res.ok) {
        const data = await res.json() as { ok?: boolean; tools?: Array<{ name: string; description?: string }> }
        if (data?.ok && Array.isArray(data.tools)) {
          return data.tools.map((t) => ({ name: t.name, description: t.description }))
        }
      }
    } catch { }

    // Fallback to real client util if available
    try {
      const tools = await realApi.getMcpTools(url) as unknown
      if (Array.isArray(tools)) {
        return tools as RegisterMCPTool[]
      }
      throw new Error('Invalid tools response')
    } catch {
      // Simple mock tools derived from URL path
      const nameSeed = generateDisplayNameFromUrl(url)
      const baseName = nameSeed.split(' ')[0] || 'Tool'
      return [
        { name: `${baseName} Search`, description: 'Search content via MCP', price: '0.01' },
        { name: `${baseName} Summarize`, description: 'Summarize text input', price: '0.02' },
        { name: `${baseName} Fetch`, description: 'Fetch a URL and return body', price: '0.01' },
      ]
    }
  }
}


// Loading fallback component
function RegisterPageLoading() {
  return (
    <div className="bg-background">
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-md bg-muted/30 border border-border">
              <Server className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-host font-extrabold text-foreground">
                Register MCP Server
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Loading...
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    </div>
  )
}

// New Register Options Page Component
function RegisterOptionsPage() {
  const router = useRouter()
  const [indexing, setIndexing] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [monetizing, setMonetizing] = useState(false)
  // Remove unused monetizeError state
  const [serverUrl, setServerUrl] = useState('')
  const [urlTouched, setUrlTouched] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [previewTools, setPreviewTools] = useState<RegisterMCPTool[] | null>(null)
  const [toolCount, setToolCount] = useState<number | null>(null)
  const [loadingTools, setLoadingTools] = useState(false)
  // Remove clipboard auto-detect related state
  const [authRequiredDetected, setAuthRequiredDetected] = useState(false)

  // Manual preview removed

  // Monetize wizard state
  const [monetizeOpen, setMonetizeOpen] = useState(false)
  const [monetizeTools, setMonetizeTools] = useState<RegisterMCPTool[]>([])
  const [priceByTool, setPriceByTool] = useState<Record<string, number>>({})
  const [evmRecipientAddress, setEvmRecipientAddress] = useState<string>("")
  const [svmRecipientAddress, setSvmRecipientAddress] = useState<string>("")
  const [recipientIsTestnet, setRecipientIsTestnet] = useState<boolean>(false)
  const [requireAuth, setRequireAuth] = useState<boolean>(false)
  const [authHeaders, setAuthHeaders] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
  const primaryWallet = usePrimaryWallet()
  const selectedWalletAddress = primaryWallet?.walletAddress || ""
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  
  // Auth configuration state
  const [authConfigOpen, setAuthConfigOpen] = useState(false)
  const [authConfigLoading, setAuthConfigLoading] = useState(false)

  // Input mode toggle state
  const [isOpenApiMode, setIsOpenApiMode] = useState(false)

  const validateEvm = (addr: string): boolean => /^0x[a-fA-F0-9]{40}$/.test((addr || '').trim())
  const validateSvm = (addr: string): boolean => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((addr || '').trim())



  const handleAddServer = useCallback(async () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL')
      return
    }
    if (authRequiredDetected) {
      toast.warning('This server requires authentication; indexing is unavailable. Use Monetize with auth headers.')
      return
    }

    try {
      setIndexing(true)
      setIndexError(null)
      
      // For OpenAPI mode, convert to MCP URL for indexing
      const urlToIndex = isOpenApiMode 
        ? `https://api2.mcpay.tech/mcp?url=${encodeURIComponent(serverUrl.trim())}`
        : serverUrl.trim()
      
      if (isOpenApiMode) {
        toast.success('OpenAPI converted to MCP! Proceeding to index.')
      }
      
      const result = await mcpDataApi.runIndex(urlToIndex)
      if ('ok' in result && result.ok) {
        toast.success('Server indexed successfully!')
        // Redirect to server page or explorer
        if (result.serverId) {
          router.push(`/servers/${result.serverId}`)
        }
      } else if ('error' in result && result.error) {
        toast.error(`Failed to index server: ${result.error}`)
      } else {
        toast.error('Failed to index server')
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setIndexError(errorMessage)
      toast.error(`Failed to index server: ${errorMessage}`)
    } finally {
      setIndexing(false)
    }
  }, [serverUrl, isOpenApiMode, router, authRequiredDetected])

  const handleMonetize = useCallback(async () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL')
      return
    }
    if (!urlValid) {
      toast.error('Enter a valid server URL')
      return
    }
    
    if (isOpenApiMode) {
      // For OpenAPI mode, first convert to MCP URL, then monetize
      try {
        const mcpUrl = `https://api2.mcpay.tech/mcp?url=${encodeURIComponent(serverUrl.trim())}`
        
        // Inspect the generated MCP URL to get tools
        const res = await fetch(`/api/inspect-mcp-server?url=${encodeURIComponent(mcpUrl)}&include=tools,prompts`)
        const data = await res.json().catch(() => ({}))
        const tools = Array.isArray(data?.tools) ? (data.tools as RegisterMCPTool[]) : []
        
        if (tools.length > 0) {
          // Keep original OpenAPI URL in input, but store MCP URL for processing
          setMonetizeTools(tools)
          const defaults: Record<string, number> = {}
          for (const t of tools) defaults[t.name] = 0.01
          setPriceByTool(defaults)
          setMonetizeOpen(true)
          toast.success('OpenAPI converted to MCP! Proceeding to monetization.')
        } else {
          toast.error('Failed to convert OpenAPI to MCP')
        }
      } catch {
        toast.error('Failed to convert OpenAPI to MCP')
      }
      return
    }
    
    // Original MCP mode logic
    // First try to inspect without auth
    try {
      const res = await fetch(`/api/inspect-mcp-server?url=${encodeURIComponent(serverUrl.trim())}&include=tools,prompts`)
      const data = await res.json().catch(() => ({}))
      const tools = Array.isArray(data?.tools) ? (data.tools as RegisterMCPTool[]) : []
      
      if (tools.length > 0) {
        // Server doesn't require auth, proceed directly to monetize wizard
        setMonetizeTools(tools)
        const defaults: Record<string, number> = {}
        for (const t of tools) defaults[t.name] = 0.01
        setPriceByTool(defaults)
        setMonetizeOpen(true)
      } else {
        // No tools found, likely requires auth - show auth config dialog
        setAuthConfigOpen(true)
      }
    } catch {
      // On error, show auth config dialog
      setAuthConfigOpen(true)
    }
  }, [serverUrl, urlValid, isOpenApiMode])

  const handleAuthConfigSubmit = useCallback(async () => {
    if (!serverUrl.trim()) return
    
    setAuthConfigLoading(true)
    try {
      const authHeadersObj = Object.fromEntries(
        authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])
      )
      
      const authHeadersParam = Object.keys(authHeadersObj).length > 0 
        ? encodeURIComponent(JSON.stringify(authHeadersObj))
        : ''
      
      const url = `/api/inspect-mcp-server?url=${encodeURIComponent(serverUrl.trim())}&include=tools,prompts${
        authHeadersParam ? `&authHeaders=${authHeadersParam}` : ''
      }`
      
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      const tools = Array.isArray(data?.tools) ? (data.tools as RegisterMCPTool[]) : []
      
      setMonetizeTools(tools)
      const defaults: Record<string, number> = {}
      for (const t of tools) defaults[t.name] = 0.01
      setPriceByTool(defaults)
      
      // Set requireAuth to true since we're using auth headers
      setRequireAuth(true)
      
      setAuthConfigOpen(false)
      
      // Small delay to ensure state updates before opening wizard
      setTimeout(() => {
        setMonetizeOpen(true)
      }, 100)
      
      if (tools.length === 0) {
        toast.warning('No tools found. Check your authentication headers.')
      }
    } catch {
      toast.error('Failed to inspect server with authentication')
    } finally {
      setAuthConfigLoading(false)
    }
  }, [serverUrl, authHeaders])

  const createMonetizedEndpointWithData = async (data: {
    prices: Record<string, number>
    evmRecipientAddress?: string
    svmRecipientAddress?: string
    networks: string[]
    requireAuth: boolean
    authHeaders: Record<string, string>
    testnet: boolean
  }) => {
    if (!serverUrl.trim()) return
    const includesEvm = data.networks.some(n => (SupportedEVMNetworks as readonly string[]).includes(n))
    const includesSvm = data.networks.some(n => (SupportedSVMNetworks as readonly string[]).includes(n))
    if (includesEvm && !validateEvm(data.evmRecipientAddress || selectedWalletAddress)) {
      toast.error('Enter a valid EVM address (0x…)')
      return
    }
    if (includesSvm && !validateSvm(data.svmRecipientAddress || '')) {
      toast.error('Enter a valid SVM address')
      return
    }
    try {
      setMonetizing(true)
      const rnd = Math.random().toString(36).slice(2, 10)
      const id = `srv_${rnd}`
      const formatPrice = (value: number): string => {
        if (!Number.isFinite(value) || value < 0) return '$0'
        const rounded = Math.round(value * 1e6) / 1e6
        let s = String(rounded)
        if (s.includes('.')) s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
        return `$${s}`
      }
      
      // For OpenAPI mode, use the converted MCP URL as the origin
      const mcpOrigin = isOpenApiMode 
        ? `https://api2.mcpay.tech/mcp?url=${encodeURIComponent(serverUrl.trim())}`
        : serverUrl.trim()
      
      const body = {
        id,
        mcpOrigin,
        recipient: {
          ...(includesEvm ? { evm: { address: (data.evmRecipientAddress || selectedWalletAddress), isTestnet: data.testnet } } : {}),
          ...(includesSvm ? { svm: { address: data.svmRecipientAddress, isTestnet: data.testnet } } : {}),
        },
        tools: monetizeTools.map((t) => ({ name: t.name, pricing: formatPrice(data.prices[t.name] ?? 0.01) })),
        requireAuth: data.requireAuth,
        authHeaders: data.requireAuth ? data.authHeaders : {},
        metadata: { 
          createdAt: new Date().toISOString(), 
          source: 'app:register', 
          networks: data.networks,
          originalUrl: isOpenApiMode ? serverUrl.trim() : undefined
        },
      }
      const resp = await fetch(`${urlUtils.getMcp2Url()}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error || `Failed to register: ${resp.status}`)
      }
      const endpoint = `${urlUtils.getMcp2Url()}/mcp?id=${encodeURIComponent(id)}`
      try {
        await navigator.clipboard.writeText(endpoint)
        toast.success('Monetized endpoint copied to clipboard!')
      } catch { }
      try {
        const result = await mcpDataApi.runIndex(endpoint)
        if ('ok' in result && result.ok && result.serverId) {
          toast.success('Server indexed successfully!')
          router.push(`/servers/${result.serverId}`)
          return
        }
      } catch { }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed to create endpoint: ${msg}`)
    } finally {
      setMonetizing(false)
    }
  }

  const _createMonetizedEndpoint = async () => {
    if (!serverUrl.trim()) return
    const includesEvm = selectedNetworks.some(n => (SupportedEVMNetworks as readonly string[]).includes(n))
    const includesSvm = selectedNetworks.some(n => (SupportedSVMNetworks as readonly string[]).includes(n))
    if (includesEvm && !validateEvm(evmRecipientAddress || selectedWalletAddress)) {
      toast.error('Enter a valid EVM address (0x…)')
      return
    }
    if (includesSvm && !validateSvm(svmRecipientAddress)) {
      toast.error('Enter a valid SVM address')
      return
    }
    try {
      setMonetizing(true)
      const rnd = Math.random().toString(36).slice(2, 10)
      const id = `srv_${rnd}`
      const authHeadersRecord: Record<string, string> = {}
      for (const row of authHeaders) {
        const k = (row.key || '').trim()
        const v = row.value || ''
        if (k && v) authHeadersRecord[k] = v
      }
      const formatPrice = (value: number): string => {
        if (!Number.isFinite(value) || value < 0) return '$0'
        const rounded = Math.round(value * 1e6) / 1e6
        let s = String(rounded)
        if (s.includes('.')) s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
        return `$${s}`
      }
      const body = {
        id,
        mcpOrigin: serverUrl.trim(),
        recipient: {
          ...(includesEvm ? { evm: { address: (evmRecipientAddress || selectedWalletAddress), isTestnet: recipientIsTestnet } } : {}),
          ...(includesSvm ? { svm: { address: svmRecipientAddress, isTestnet: recipientIsTestnet } } : {}),
        },
        tools: monetizeTools.map((t) => ({ name: t.name, pricing: formatPrice(priceByTool[t.name] ?? 0.01) })),
        requireAuth: requireAuth === true,
        authHeaders: requireAuth ? authHeadersRecord : {},
        metadata: { createdAt: new Date().toISOString(), source: 'app:register', networks: selectedNetworks },
      }
      const resp = await fetch(`${urlUtils.getMcp2Url()}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error || `Failed to register: ${resp.status}`)
      }
      const endpoint = `${urlUtils.getMcp2Url()}/mcp?id=${encodeURIComponent(id)}`
      try {
        await navigator.clipboard.writeText(endpoint)
        toast.success('Monetized endpoint copied to clipboard!')
      } catch { }
      try {
        const result = await mcpDataApi.runIndex(endpoint)
        if ('ok' in result && result.ok && result.serverId) {
          toast.success('Server indexed successfully!')
          router.push(`/servers/${result.serverId}`)
          return
        }
      } catch { }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed to create endpoint: ${msg}`)
    } finally {
      setMonetizing(false)
    }
  }

  // --- URL validation and preview helpers ---
  const validateServerUrl = (value: string) => {
    try {
      const u = new URL(value)
      if (!/^https?:$/.test(u.protocol)) return { valid: false, error: 'URL must start with http or https' }
      if (!u.hostname) return { valid: false, error: 'URL must include a hostname' }
      return { valid: true as const }
    } catch {
      const example = isOpenApiMode ? 'https://api.example.com/openapi.json' : 'https://example.com/mcp'
      return { valid: false as const, error: `Enter a valid URL (e.g., ${example})` }
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcp_register_last_url')
      if (saved) setServerUrl(saved)
    } catch { }
  }, [])

  // Fetch tools when URL becomes valid
  useEffect(() => {
    if (urlValid && serverUrl.trim()) {
      setLoadingTools(true)
      const urlToInspect = isOpenApiMode 
        ? `https://api2.mcpay.tech/mcp?url=${encodeURIComponent(serverUrl.trim())}`
        : serverUrl.trim()
      
      api.getMcpTools(urlToInspect)
        .then((tools) => {
          setToolCount(tools.length)
          setPreviewTools(tools)
        })
        .catch(() => {
          setToolCount(0)
          setPreviewTools([])
        })
        .finally(() => {
          setLoadingTools(false)
        })
    } else {
      setToolCount(null)
      setPreviewTools(null)
    }
  }, [urlValid, serverUrl, isOpenApiMode])

  // Preview removed

  const onPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setServerUrl(text)
    } catch {
      toast.error('Could not read clipboard')
    }
  }, [])

  const onClear = useCallback(() => {
    setServerUrl('')
    setUrlTouched(false)
    setUrlValid(false)
    setUrlError(null)
    setPreviewTools(null)
    setToolCount(null)
  }, [])

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback((e) => {
    if (e.key === 'Enter' && urlValid && !monetizing) {
      e.preventDefault()
      handleMonetize()
    }
  }, [urlValid, monetizing, handleMonetize])


  return (
    <div className="bg-background flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-6xl px-4 md:px-6 mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight">Register</h2>
            <p className="text-base font-inter text-muted-foreground mt-2">
              Connect your MCP/API and start accepting payments instantly.
            </p>
          </div>

          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            {/* Tabs for MCP/API Selection */}
            <Tabs value={isOpenApiMode ? "api" : "mcp"} onValueChange={(value) => {
              setIsOpenApiMode(value === "api")
              setServerUrl('')
              setUrlValid(false)
              setUrlError(null)
              setPreviewTools(null)
              setAuthRequiredDetected(false)
            }} className="mb-10">
              <TabsList size="tall" variant="equal" className="max-w-md">
                <TabsTrigger value="mcp" size="tall" variant="highlight">MCP SERVER</TabsTrigger>
                <TabsTrigger value="api" size="tall" variant="highlight">API</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* URL Input Section */}
            <div className="mb-10">
              <Label htmlFor="server-url" className="mb-2 block">
                {isOpenApiMode ? "API URL" : "MCP SERVER URL"}
              </Label>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
                <div className="relative flex-1 w-full">
                  <Input
                    id="server-url"
                    type="url"
                    variant="tall"
                    aria-label={isOpenApiMode ? "API URL" : "MCP Server URL"}
                    aria-describedby="server-url-help"
                    aria-invalid={Boolean(serverUrl) && !urlValid}
                    placeholder={isOpenApiMode ? "https://api.example.com/openapi.json" : "https://your-mcp-server.mcp"}
                    value={serverUrl}
                    onChange={(e) => {
                      const val = e.target.value
                      setServerUrl(val)
                      const { valid, error } = validateServerUrl(val.trim())
                      setUrlValid(valid)
                      setUrlError(error || null)
                      setAuthRequiredDetected(false)
                      if (!valid || !val.trim()) {
                        setToolCount(null)
                        setPreviewTools(null)
                      }
                    }}
                    onBlur={() => {
                      setUrlTouched(true)
                      try { localStorage.setItem('mcp_register_last_url', serverUrl.trim()) } catch {}
                    }}
                    onKeyDown={onKeyDown}
                    className={cn(
                      "flex-1 pr-9 font-mono transition-shadow bg-background text-foreground placeholder:text-muted-foreground focus:bg-background focus:shadow-[0_0_0_2px_rgba(0,82,255,0.25)]",
                      urlValid ? "border-foreground" : "border-border"
                    )}
                  />
                  {(serverUrl || urlTouched) && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      {urlValid ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-foreground" aria-label="Valid URL">
                              <CircleCheck className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Valid URL</TooltipContent>
                        </Tooltip>
                      ) : serverUrl ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-red-600 dark:text-red-400" aria-label="Invalid URL">
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{urlError || 'Enter a valid URL'}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-center md:ml-4">
                  <Button type="button" variant="secondary" size="tall" onClick={onPaste} className="shrink-0 flex-1 md:flex-none" aria-label="Paste from clipboard">
                    PASTE
                  </Button>

                  <Button type="button" variant="outline" size="tall" onClick={onClear} className="shrink-0 flex-1 md:flex-none" aria-label="Clear">
                    CLEAR
                  </Button>
                </div>
              </div>
              
              {/* Dynamic Text Highlight */}
              <div className="flex items-center gap-2 mt-2">
                {!serverUrl.trim() ? (
                  <HighlighterText>Paste an URL to get started</HighlighterText>
                ) : !urlValid ? (
                  <HighlighterText>INVALID URL</HighlighterText>
                ) : urlValid ? (
                  <>
                    <HighlighterText className="text-teal-700 bg-teal-500/10 dark:text-teal-200 dark:bg-teal-800/50">VALID URL</HighlighterText>
                    {loadingTools ? (
                      <HighlighterText>FETCHING TOOLS</HighlighterText>
                    ) : toolCount !== null ? (
                      <HighlighterText>{toolCount} TOOLS</HighlighterText>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {/* Monetize Wizard */}
            <MonetizeWizard
              open={monetizeOpen}
              onOpenChange={(open) => setMonetizeOpen(open)}
              serverUrl={serverUrl}
              tools={monetizeTools}
              initialAuthHeaders={authHeaders}
              initialRequireAuth={requireAuth}
              onCreate={async ({ prices, evmRecipientAddress: evmAddr, svmRecipientAddress: svmAddr, networks, requireAuth, authHeaders, testnet }) => {
                setPriceByTool(prices)
                setEvmRecipientAddress(evmAddr || '')
                setSvmRecipientAddress(svmAddr || '')
                setSelectedNetworks(networks)
                setRequireAuth(requireAuth)
                setAuthHeaders(Object.entries(authHeaders).map(([key, value]) => ({ key, value })))
                setRecipientIsTestnet(testnet)
                await createMonetizedEndpointWithData({ prices, evmRecipientAddress: evmAddr, svmRecipientAddress: svmAddr, networks, requireAuth, authHeaders, testnet })
              }}
            />


            {/* Dynamic Options Based on URL Input */}
            {urlValid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Monetize */}
                <div className="flex flex-col gap-8 p-6 rounded-lg bg-card">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-bold font-host text-foreground">Monetize</h3>
                    <p className="font-inter font-medium text-muted-foreground leading-relaxed text-lg">
                      Wrap your server and set specific prices per tool call.
                    </p>
                  </div>
                  <div className="mt-auto pt-12">
                    <Button
                      onClick={handleMonetize}
                      disabled={monetizing}
                      variant="customTallPrimary"
                      size="tall"
                      className="w-full"
                    >
                      {monetizing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isOpenApiMode ? 'Converting & Creating...' : 'Creating...'}
                        </>
                      ) : (
                        'MONETIZE'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Option 2: Index Server */}
                <div className="flex flex-col gap-8 p-6 rounded-lg bg-card">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-bold font-host text-foreground">Index Server</h3>
                    <p className="font-inter font-medium text-muted-foreground leading-relaxed text-lg">
                      For already x402-enabled servers. Index to increase discoverability and analytics.
                    </p>
                  </div>
                  <div className="mt-auto pt-12">
                    <Button
                      onClick={handleAddServer}
                      disabled={indexing || authRequiredDetected}
                      variant="customTallSecondary"
                      size="tall"
                      className="w-full"
                    >
                      {indexing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isOpenApiMode ? 'Converting & Indexing...' : 'Indexing...'}
                        </>
                      ) : (
                        'INDEX'
                      )}
                    </Button>
                    {indexError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">{indexError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Auth Configuration Dialog */}
      <Dialog open={authConfigOpen} onOpenChange={setAuthConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              This MCP server requires authentication. Please provide the necessary headers to access its tools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Authentication Headers</div>
              <div className="space-y-2">
                {authHeaders.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Header name (e.g., Authorization)"
                      value={header.key}
                      onChange={(e) => setAuthHeaders(prev => 
                        prev.map((h, i) => i === index ? { ...h, key: e.target.value } : h)
                      )}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => setAuthHeaders(prev => 
                        prev.map((h, i) => i === index ? { ...h, value: e.target.value } : h)
                      )}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAuthHeaders(prev => prev.filter((_, i) => i !== index))}
                      disabled={authHeaders.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthHeaders(prev => [...prev, { key: '', value: '' }])}
                className="w-full"
              >
                Add Header
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Common headers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>Authorization: Bearer YOUR_API_KEY</code></li>
                <li><code>x-api-key: YOUR_API_KEY</code></li>
                <li><code>X-API-Key: YOUR_API_KEY</code></li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthConfigOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAuthConfigSubmit}
              disabled={authConfigLoading || authHeaders.every(h => !h.key || !h.value)}
            >
              {authConfigLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect & Continue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// Main export with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterOptionsPage />
    </Suspense>
  )
}
