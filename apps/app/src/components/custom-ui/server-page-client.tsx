"use client"

import { AboutSection } from "@/components/custom-ui/about-section"
import { ConnectPanel } from "@/components/custom-ui/connect-panel"
import { RecentPaymentsCard } from "@/components/custom-ui/recent-payments-card"
import { ServerDetailsCard } from "@/components/custom-ui/server-details-card"
import { ServerHeader } from "@/components/custom-ui/server-header"
import { ToolExecutionModal, type ToolFromMcpServerWithStats } from "@/components/custom-ui/tool-execution-modal"
import HighlighterText from "@/components/custom-ui/highlighter-text"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { mcpDataApi, urlUtils } from "@/lib/client/utils"
import { isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  Loader2,
  RefreshCcw,
  Copy,
  PlugZap
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ServerDetail = {
  serverId: string
  origin: string
  originRaw?: string
  status?: string
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'disabled' | 'flagged'
  qualityScore?: number
  lastSeenAt?: string
  indexedAt?: string
  info: { name?: string; description?: string; icon?: string }
  tools: Array<Record<string, unknown>>
  summary: { lastActivity?: string; totalTools: number; totalRequests: number; totalPayments: number }
  dailyAnalytics: Array<{ date: string; totalRequests: number }>
  recentPayments: Array<{ 
    id: string; 
    createdAt: string; 
    status: 'completed' | 'failed'; 
    network?: string; 
    transactionHash?: string;
    amountFormatted?: string;
    currency?: string;
    vlayerProof?: {
      success: boolean;
      version?: string;
      notaryUrl?: string;
      valid: boolean;
      generatedAt?: string;
    };
  }>
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  return new Date(dateString).toLocaleString()
}

const formatRelative = (dateString?: string) => {
  if (!dateString) return ""
  const ms = Date.now() - new Date(dateString).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// Compact relative time like the explorer (secs/mins/hrs/days)
function formatRelativeShort(iso?: string, now = Date.now()) {
  if (!iso) return ""
  const diffMs = new Date(iso).getTime() - now
  const abs = Math.abs(diffMs)
  const sec = Math.round(abs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const month = Math.round(day / 30)
  const year = Math.round(day / 365)

  const value =
    sec < 60 ? { n: Math.max(1, sec), u: "secs" } :
      min < 60 ? { n: min, u: "mins" } :
        hr < 24 ? { n: hr, u: "hrs" } :
          day < 30 ? { n: day, u: "days" } :
            month < 12 ? { n: month, u: "mos" } :
              { n: year, u: "yrs" }

  return `${value.n} ${value.u} ${diffMs <= 0 ? "ago" : "from now"}`
}

const truncateHash = (h: string, left = 6, right = 7) =>
  h && h.length > left + right + 3 ? `${h.slice(0, left)}...${h.slice(-right)}` : h

const formatAddress = (address: string) => {
  if (!address || address.length < 12) {
    return { start: address, middle: '', end: '' }
  }
  const start = address.slice(0, 6)
  const middle = address.slice(6, -6)
  const end = address.slice(-6)
  return { start, middle, end }
}

function safeTxUrl(network?: string, hash?: string) {
  if (!network || !hash) return undefined
  if (isNetworkSupported(network)) {
    return getExplorerUrl(hash, network as UnifiedNetwork, 'tx')
  }
  return `https://etherscan.io/tx/${hash}`
}

interface ServerPageClientProps {
  serverId: string
  initialData?: ServerDetail | null
}

export function ServerPageClient({ serverId, initialData }: ServerPageClientProps) {
  const { isDark } = useTheme()

  const [data, setData] = useState<ServerDetail | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [showToolModal, setShowToolModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [activeTab, setActiveTab] = useState<'tools' | 'payments' | 'connect'>('tools')
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [expandedNetworkDetails, setExpandedNetworkDetails] = useState<Set<string>>(new Set())
  const [toolsSearch, setToolsSearch] = useState("")

  useEffect(() => {
    if (initialData) return // Don't refetch if we have initial data
    
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await mcpDataApi.getServerById(serverId)
        if (!mounted) return
        setData(res as ServerDetail)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load server')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    if (serverId) load()
    return () => { mounted = false }
  }, [serverId, initialData])

  const handleRefresh = async () => {
    if (!data?.origin) {
      toast.error('Missing server origin')
      return
    }
    try {
      setReindexing(true)
      const res = await mcpDataApi.runIndex(data.origin)
      if ('ok' in res && (res as { ok?: boolean }).ok) {
        toast.success('Re-index triggered')
      } else if ('error' in res && typeof (res as { error?: string }).error === 'string') {
        toast.error(String((res as { error?: string }).error))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to trigger re-index')
    } finally {
      setReindexing(false)
    }
  }

  const proxyUrl = useMemo(() => {
    if (!data?.origin) return ""
    try {
      return urlUtils.getMcpUrl(data.origin)
    } catch {
      return ""
    }
  }, [data?.origin])

  const openToolModal = (tool: Record<string, unknown>) => {
    const normalized: ToolFromMcpServerWithStats = {
      id: String(tool.id ?? tool.name ?? 'tool'),
      name: String(tool.name ?? 'tool'),
      description: String((tool as { description?: string })?.description ?? ''),
      inputSchema: ((tool as { inputSchema?: unknown })?.inputSchema ?? (tool as { parameters?: { jsonSchema?: unknown } })?.parameters?.jsonSchema ?? {}) as unknown as ReturnType<typeof JSON.parse>,
      pricing: Array.isArray((tool as { pricing?: unknown })?.pricing) ? (tool as { pricing?: unknown[] }).pricing as unknown[] as ToolFromMcpServerWithStats['pricing'] : undefined,
      isMonetized: Boolean((tool as { isMonetized?: boolean })?.isMonetized),
    }
    setSelectedTool(normalized)
    setShowToolModal(true)
  }

  function InstallationSidebar() {
    if (!data) return null
    
    const server = {
      id: data.serverId,
      displayName: data.info?.name || data.origin,
      baseUrl: proxyUrl || data.origin,
      oauthSupported: true
    }
    
    return (
      <ConnectPanel 
        server={server}
        initialAuthMode="oauth"
      />
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading server...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-16">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
            <h3 className="text-lg font-medium mb-2">Failed to load server</h3>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => location.reload()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Normalize tools data
  const normalizedTools = useMemo(() => {
    return (data.tools || []).map((t, idx) => {
                        const annotations = (t as { annotations?: Record<string, unknown> })?.annotations || {};
                        const paymentHint = Boolean(annotations.paymentHint);
                        const paymentPriceUSD = annotations.paymentPriceUSD as number | undefined;
                        const paymentNetworks = annotations.paymentNetworks as Array<{
                          network: string;
                          recipient: string;
                          maxAmountRequired: string;
                          asset: { address: string; symbol?: string; decimals?: number };
                          type: 'evm' | 'svm';
                        }> | undefined;
                        const paymentVersion = annotations.paymentVersion as number | undefined;

                        return {
                          id: (t?.id as string) || (t?.name as string) || `tool-${idx}`,
                          name: (t?.name as string) || `tool-${idx}`,
                          description: (t?.description as string) || '',
                          inputSchema: ((t as { inputSchema?: unknown; parameters?: { jsonSchema?: unknown } })?.inputSchema || (t as { parameters?: { jsonSchema?: unknown } })?.parameters?.jsonSchema || {}) as Record<string, unknown>,
                          pricing: Array.isArray((t as { pricing?: unknown[] })?.pricing) ? (t as { pricing?: unknown[] }).pricing as Array<{ label?: string; amount?: number; currency?: string; active?: boolean }> : [],
                          isMonetized: Array.isArray((t as { pricing?: Array<{ active?: boolean }> })?.pricing) && ((t as { pricing?: Array<{ active?: boolean }> }).pricing || []).some((p) => p?.active === true),
                          paymentHint,
                          paymentPriceUSD,
                          paymentNetworks,
                          paymentVersion,
                        };
                      })
  }, [data.tools])

  const filteredTools = useMemo(() => {
    if (!toolsSearch.trim()) return normalizedTools
    const q = toolsSearch.toLowerCase().trim()
    return normalizedTools.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    )
  }, [normalizedTools, toolsSearch])

  // Get MCP URL display
  const mcpUrlDisplay = useMemo(() => {
    if (!data.origin) return ""
    try {
      const url = new URL(data.origin)
      return url.hostname.toUpperCase()
    } catch {
      return data.origin.toUpperCase()
    }
  }, [data.origin])

  const server = useMemo(() => {
    if (!data) return null
    return {
      id: data.serverId,
      displayName: data.info?.name || data.origin,
      baseUrl: proxyUrl || data.origin,
      oauthSupported: true
    }
  }, [data, proxyUrl])
                      
                      return (
    <div className="bg-background min-h-screen">
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-6xl md:px-6 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
              <div className="flex-1">
                {/* Title */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight mb-2">
                  {data?.info?.name || data?.origin || ''}
                </h1>

                {/* MCP URL */}
                {mcpUrlDisplay && (
                  <p className="text-base sm:text-lg text-muted-foreground mb-4 font-mono">
                    {mcpUrlDisplay}
                  </p>
                )}

                {/* Stats with HighlighterText */}
                <div className="flex items-center gap-2 flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-4 md:mx-0 px-4 md:px-0 scrollbar-hide">
              <div className="inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted shrink-0 whitespace-nowrap">
                <span className="text-foreground">{data.summary.totalRequests.toLocaleString()}</span>
                <span className="text-muted-foreground">&nbsp;REQUESTS</span>
              </div>
              <div className="inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted shrink-0 whitespace-nowrap">
                <span className="text-foreground">{data.summary.totalTools}</span>
                <span className="text-muted-foreground">&nbsp;TOOLS</span>
              </div>
              <div className="inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted shrink-0 whitespace-nowrap">
                <span className="text-foreground">{data.summary.totalPayments}</span>
                <span className="text-muted-foreground">&nbsp;PAYMENTS</span>
              </div>
              <div className="inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted shrink-0 whitespace-nowrap">
                <span className="text-foreground">{data.qualityScore || 0}</span>
                <span className="text-muted-foreground">&nbsp;QUALITY SCORE</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted cursor-pointer shrink-0 whitespace-nowrap">
                      <span className="text-foreground">{formatRelative(data.summary.lastActivity)}</span>
                      <span className="text-muted-foreground">&nbsp;ACTIVE</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{formatDate(data.summary.lastActivity)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
                </div>
              </div>
              
              {/* Connect Button */}
              {data?.origin && (
                <Button
                  variant="customTallAccentAmber"
                  size="tall"
                  onClick={() => {
                    const url = urlUtils.getMcpUrl(data.origin)
                    navigator.clipboard.writeText(url)
                    toast.success("Copied MCP endpoint to clipboard")
                  }}
                  className="rounded-[2px] w-full md:w-auto md:shrink-0 mt-4 md:mt-0"
                >
                  <PlugZap className="size-4" />
                  CONNECT
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tools' | 'payments' | 'connect')} className="mb-6">
              <TabsList size="tall" variant="equal" className="max-w-md">
                <TabsTrigger value="tools" size="tall" variant="highlight">TOOLS</TabsTrigger>
                <TabsTrigger value="payments" size="tall" variant="highlight">PAYMENTS</TabsTrigger>
                <TabsTrigger value="connect" size="tall" variant="highlight">CONNECT</TabsTrigger>
              </TabsList>

              {/* TOOLS Tab */}
              <TabsContent value="tools" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold font-host text-foreground leading-tight">Tools</h2>
                      <HighlighterText className="!text-foreground">{normalizedTools.length}</HighlighterText>
                    </div>

                    <Input
                      placeholder="Search Tools"
                      value={toolsSearch}
                      onChange={(e) => setToolsSearch(e.target.value)}
                      variant="tall"
                      className="w-full"
                    />

                    <div className="space-y-3">
                      {filteredTools.map((tool) => {
                        const isExpanded = expandedTools.has(tool.id)
                        const isNetworkExpanded = expandedNetworkDetails.has(tool.id)

                        return (
                          <div key={tool.id} className={cn("flex gap-4 p-4 pr-6 md:pr-4 rounded-[2px] bg-card", isExpanded && "flex-col")}>
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-center justify-between gap-4 w-full">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-mono text-sm font-medium text-foreground mb-1">{tool.name}</h3>
                                {tool.description && (
                                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {tool.paymentHint && tool.paymentPriceUSD && (
                                  <HighlighterText variant="blue">${tool.paymentPriceUSD}</HighlighterText>
                                )}
                                {tool.paymentNetworks && tool.paymentNetworks.length > 0 && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                        <div className="cursor-pointer inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted transition-colors group">
                                          <span className="text-foreground group-hover:text-foreground">{tool.paymentNetworks.length}</span>
                                          <span className="text-muted-foreground group-hover:text-foreground">&nbsp;NETWORKS</span>
                                        </div>
                                        </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="text-sm">
                                          {tool.paymentNetworks.map((net, idx) => net.network.charAt(0).toUpperCase() + net.network.slice(1).toLowerCase()).join(', ')}
                                        </div>
                                      </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <div className="w-4"></div>
                                  </>
                                )}
                              <Button
                                  variant="customTallAccent"
                                size="sm"
                                  className="h-8 rounded-[2px]"
                                  onClick={() => openToolModal(tool as unknown as Record<string, unknown>)}
                                >
                                  RUN
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedTools)
                                    if (isExpanded) {
                                      newExpanded.delete(tool.id)
                                    } else {
                                      newExpanded.add(tool.id)
                                    }
                                    setExpandedTools(newExpanded)
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                              </Button>
                              </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="flex md:hidden flex-col gap-3 w-full">
                              {/* Row 1: Tool name */}
                              <h3 className="font-mono text-sm font-medium text-foreground">{tool.name}</h3>
                              
                              {/* Row 2: Description */}
                              {tool.description && (
                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                              )}
                              
                              {/* Row 3: Price and Network */}
                              <div className="flex items-center gap-2">
                                {tool.paymentHint && tool.paymentPriceUSD && (
                                  <HighlighterText variant="blue">${tool.paymentPriceUSD}</HighlighterText>
                                )}
                                {tool.paymentNetworks && tool.paymentNetworks.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px] bg-muted transition-colors group">
                                          <span className="text-foreground group-hover:text-foreground">{tool.paymentNetworks.length}</span>
                                          <span className="text-muted-foreground group-hover:text-foreground">&nbsp;NETWORKS</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="text-sm">
                                          {tool.paymentNetworks.map((net, idx) => net.network.charAt(0).toUpperCase() + net.network.slice(1).toLowerCase()).join(', ')}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              
                              {/* Row 4: Buttons (INFO left, RUN right) */}
                              <div className="flex gap-2 w-full">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 w-[50%] rounded-[2px]"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedTools)
                                    if (isExpanded) {
                                      newExpanded.delete(tool.id)
                                    } else {
                                      newExpanded.add(tool.id)
                                    }
                                    setExpandedTools(newExpanded)
                                  }}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      INFO
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      INFO
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="customTallAccent"
                                  size="sm"
                                  className="h-8 w-[50%] rounded-[2px]"
                                  onClick={() => openToolModal(tool as unknown as Record<string, unknown>)}
                                >
                                  RUN
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="mt-4 space-y-8 pt-4 w-full">
                                {/* Input Properties - Always visible */}
                                {tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema !== null && 'properties' in tool.inputSchema && tool.inputSchema.properties && typeof tool.inputSchema.properties === 'object' && (
                                  <div>
                                    <div className="mb-4 font-mono text-sm uppercase font-medium tracking-wider text-foreground">
                                      INPUT PROPERTIES
                                    </div>
                                    <div className="space-y-3">
                                      {Object.entries(tool.inputSchema.properties as Record<string, unknown>).map(([key, value]: [string, Record<string, unknown>]) => (
                                        <div key={key} className="bg-muted-2 rounded-[2px] p-2 flex items-center justify-between">
                                          <span className="font-mono text-sm text-foreground">
                                            {key}
                                            {Array.isArray(tool.inputSchema?.required) && tool.inputSchema.required.includes(key) && (
                                              <span className="text-red-500 ml-1">*</span>
                                            )}
                                          </span>
                                          <HighlighterText className="ml-auto">
                                            {typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string' ? value.type.toUpperCase() : 'ANY'}
                                          </HighlighterText>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Summary - Always visible */}
                                {tool.paymentHint && (
                                  <div>
                                    <div className="mb-4 font-mono text-sm uppercase font-medium tracking-wider text-foreground">
                                      SUMMARY
                                    </div>
                                    <div className="space-y-3">
                                      {tool.paymentPriceUSD && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-xs tracking-wider text-muted-foreground">USD PRICE</span>
                                          <HighlighterText variant="blue">${tool.paymentPriceUSD}</HighlighterText>
                                        </div>
                                      )}
                                      {tool.paymentNetworks && tool.paymentNetworks.length > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-xs tracking-wider text-muted-foreground">NETWORKS</span>
                                          <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {tool.paymentNetworks.map((net, idx) => (
                                              <HighlighterText className="!text-foreground" key={idx}>{net.network}</HighlighterText>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {tool.paymentNetworks && tool.paymentNetworks.length > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-xs tracking-wider text-muted-foreground">NETWORKS TYPES</span>
                                          <HighlighterText>{[...new Set(tool.paymentNetworks.map(n => n.type))].join(', ').toUpperCase()}</HighlighterText>
                                        </div>
                                      )}
                                      {tool.paymentNetworks && tool.paymentNetworks.length > 0 && tool.paymentNetworks[0]?.recipient && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-xs tracking-wider text-muted-foreground">RECIPIENT ADDRESS</span>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs tracking-wider">
                                              {(() => {
                                                const formatted = formatAddress(tool.paymentNetworks[0].recipient)
                                                return (
                                                  <>
                                                    <span className="text-foreground">{formatted.start}</span>
                                                    <span className="text-muted-foreground hidden md:inline">{formatted.middle}</span>
                                                    <span className="text-muted-foreground md:hidden"> ... </span>
                                                    <span className="text-foreground">{formatted.end}</span>
                                                  </>
                                                )
                                              })()}
                                            </span>
                                            <div 
                                              className="inline-flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide bg-muted text-muted-foreground size-5 rounded-[2px] hover:text-foreground transition-colors cursor-pointer"
                                              onClick={() => {
                                                navigator.clipboard.writeText(tool.paymentNetworks![0].recipient)
                                                toast.success('Address copied')
                                              }}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Network Details - Toggleable */}
                                {tool.paymentNetworks && tool.paymentNetworks.length > 0 && (
                                  <div>
                                    <div className="w-full">
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedNetworkDetails)
                                          if (isNetworkExpanded) {
                                            newExpanded.delete(tool.id)
                                          } else {
                                            newExpanded.add(tool.id)
                                          }
                                          setExpandedNetworkDetails(newExpanded)
                                        }}
                                        className={cn(
                                          "inline-flex items-center gap-2 font-mono text-sm uppercase font-medium tracking-wider transition-colors underline decoration-dotted cursor-pointer",
                                          isNetworkExpanded ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                      >
                                        <span>NETWORK DETAILS</span>
                                        {isNetworkExpanded ? (
                                          <ChevronsDownUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronsUpDown className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                    {isNetworkExpanded && (
                                      <div>
                                        {tool.paymentNetworks.map((network, idx) => {
                                          const amount = network.maxAmountRequired;
                                          const symbol = network.asset.symbol || 'tokens';
                                          const decimals = network.asset.decimals || 6;
                                          const formattedAmount = (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);

                                          return (
                                            <div key={idx} className="space-y-3 mt-12">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <HighlighterText className="!text-foreground">{network.network}</HighlighterText>
                                                  {tool.paymentPriceUSD && (
                                                    <HighlighterText variant="blue">${tool.paymentPriceUSD}</HighlighterText>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="space-y-2 font-mono">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs tracking-wider text-muted-foreground">RECIPIENT</span>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs tracking-wider">
                                                      {(() => {
                                                        const formatted = formatAddress(network.recipient)
                                                        return (
                                                          <>
                                                            <span className="text-foreground">{formatted.start}</span>
                                                            <span className="text-muted-foreground hidden md:inline">{formatted.middle}</span>
                                                            <span className="text-muted-foreground md:hidden"> ... </span>
                                                            <span className="text-foreground">{formatted.end}</span>
                                                          </>
                                                        )
                                                      })()}
                                                    </span>
                                                    <div 
                                                      className="inline-flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide bg-muted text-muted-foreground size-5 rounded-[2px] hover:text-foreground transition-colors cursor-pointer"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(network.recipient)
                                                        toast.success('Address copied')
                                                      }}
                                                    >
                                                      <Copy className="h-3 w-3" />
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs tracking-wider text-muted-foreground">ASSET</span>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs tracking-wider">
                                                      {(() => {
                                                        const formatted = formatAddress(network.asset.address)
                                                        return (
                                                          <>
                                                            <span className="text-foreground">{formatted.start}</span>
                                                            <span className="text-muted-foreground hidden md:inline">{formatted.middle}</span>
                                                            <span className="text-muted-foreground md:hidden"> ... </span>
                                                            <span className="text-foreground">{formatted.end}</span>
                                                          </>
                                                        )
                                                      })()}
                                                    </span>
                                                    <div 
                                                      className="inline-flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide bg-muted text-muted-foreground size-5 rounded-[2px] hover:text-foreground transition-colors cursor-pointer"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(network.asset.address)
                                                        toast.success('Address copied')
                                                      }}
                                                    >
                                                      <Copy className="h-3 w-3" />
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs tracking-wider text-muted-foreground">ATOMIC</span>
                                                  <span className="text-xs">
                                                    <span className="text-foreground">{Number(amount).toLocaleString()}</span>
                                                    <span className="text-muted-foreground"> UNITS</span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs tracking-wider text-muted-foreground">DECIMALS</span>
                                                  <span className="text-xs text-foreground">{decimals}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs tracking-wider text-muted-foreground">FORMATTED</span>
                                                  <span className="text-xs">
                                                    <span className="text-foreground">{formattedAmount}</span>
                                                    <span className="text-muted-foreground"> {symbol.toUpperCase()}</span>
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )
                      })}
                    </div>
                  </div>

              <div className="lg:col-span-1 space-y-4">
                    {server && (
                      <ConnectPanel 
                        server={server}
                        initialAuthMode="oauth"
                      />
                    )}
                <ServerDetailsCard
                  details={{
                    deploymentRef: data.indexedAt ? `indexed ${formatRelative(data.indexedAt)}` : undefined,
                    license: (data as unknown as { info?: { license?: string } })?.info?.license,
                    isLocal: /localhost|127\.0\.0\.1/.test(data.origin),
                    publishedAt: (data as unknown as { info?: { publishedAt?: string } })?.info?.publishedAt,
                    repo: (data as unknown as { info?: { repo?: string } })?.info?.repo,
                    homepage: (data as unknown as { info?: { homepage?: string } })?.info?.homepage,
                  }}
                  onRefresh={handleRefresh}
                  isRefreshing={reindexing}
                />
              </div>
            </div>
              </TabsContent>

              {/* PAYMENTS Tab */}
              <TabsContent value="payments" className="mt-6">
                <RecentPaymentsCard 
                  serverId={serverId} 
                  initialPayments={data.recentPayments}
                  renderHeader={(lastRefreshTime, autoRefreshEnabled, paymentsCount, onToggleAutoRefresh, onRefresh) => (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold font-host text-foreground leading-tight">Recent Payments</h2>
                          <HighlighterText className="!text-foreground">{paymentsCount}</HighlighterText>
                        </div>
                        <div className="flex items-center justify-between gap-4 font-mono text-xs uppercase w-full">
                          <div className={`flex items-center gap-1.5 font-semibold tracking-wider ${autoRefreshEnabled ? 'text-teal-700 dark:text-teal-200' : 'text-muted-foreground'}`}>
                            {autoRefreshEnabled && <Loader2 className="size-3 animate-spin" />}
                            <span>AUTO REFRESH {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
                          </div>
                          {lastRefreshTime && (
                            <span className="text-muted-foreground">Updated {formatRelativeShort(lastRefreshTime.toISOString())}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={autoRefreshEnabled ? "customTallAccent" : "secondary"}
                                size="sm"
                                className="h-8 rounded-[2px] !transition-none"
                                onClick={onToggleAutoRefresh}
                              >
                                AUTO {autoRefreshEnabled ? "ON" : "OFF"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {autoRefreshEnabled 
                                ? "Pause auto-refresh (every 10s)" 
                                : "Enable auto-refresh every 10 seconds"
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-[2px] !transition-none"
                          onClick={onRefresh}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                />
              </TabsContent>

              {/* CONNECT Tab */}
              <TabsContent value="connect" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {server && (
                      <ConnectPanel 
                        server={server}
                        initialAuthMode="oauth"
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <ServerDetailsCard
                      details={{
                        deploymentRef: data.indexedAt ? `indexed ${formatRelative(data.indexedAt)}` : undefined,
                        license: (data as unknown as { info?: { license?: string } })?.info?.license,
                        isLocal: /localhost|127\.0\.0\.1/.test(data.origin),
                        publishedAt: (data as unknown as { info?: { publishedAt?: string } })?.info?.publishedAt,
                        repo: (data as unknown as { info?: { repo?: string } })?.info?.repo,
                        homepage: (data as unknown as { info?: { homepage?: string } })?.info?.homepage,
                      }}
                      onRefresh={handleRefresh}
                      isRefreshing={reindexing}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Bottom spacing */}
      <div className="h-16"></div>
      {showToolModal && selectedTool && (
        <ToolExecutionModal
          isOpen={showToolModal}
          onClose={() => { setShowToolModal(false); setSelectedTool(null) }}
          tool={selectedTool}
          serverId={data.serverId}
          url={data.originRaw}
        />
      )}
    </div>
  )
}
