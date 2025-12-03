"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlugZap } from "lucide-react"
import { ToolExecutionModal, type ToolFromMcpServerWithStats } from "./tool-execution-modal"
import { mcpDataApi, urlUtils } from "@/lib/client/utils"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"
import { toast } from "sonner"

interface McpExampleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  serverId?: string
}

// Example tool data matching the structure from server-page-client
const exampleTools: Array<{
  id: string
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  paymentHint?: boolean
  paymentPriceUSD?: number
  paymentNetworks?: Array<{
    network: string
    recipient: string
    maxAmountRequired: string
    asset: { address: string; symbol?: string; decimals?: number }
    type: 'evm' | 'svm'
  }>
}> = [
  {
    id: "getUserInfo",
    name: "getUserInfo",
    description: "Retrieve user profile information by username or user ID",
    paymentHint: true,
    paymentPriceUSD: 0.01,
    paymentNetworks: [{
      network: "base",
      recipient: "0x0000000000000000000000000000000000000000",
      maxAmountRequired: "1000000",
      asset: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
      type: "evm"
    }]
  },
  {
    id: "getUserTweets",
    name: "getUserTweets",
    description: "Fetch recent tweets from a specific user",
    paymentHint: true,
    paymentPriceUSD: 0.02,
    paymentNetworks: [{
      network: "base",
      recipient: "0x0000000000000000000000000000000000000000",
      maxAmountRequired: "2000000",
      asset: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
      type: "evm"
    }]
  },
  {
    id: "advancedTweetSearch",
    name: "advancedTweetSearch",
    description: "Search tweets with advanced filters and parameters",
    paymentHint: true,
    paymentPriceUSD: 0.03,
    paymentNetworks: [{
      network: "base",
      recipient: "0x0000000000000000000000000000000000000000",
      maxAmountRequired: "3000000",
      asset: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
      type: "evm"
    }]
  },
  {
    id: "getTweetThread",
    name: "getTweetThread",
    description: "Get a complete thread of tweets starting from a root tweet",
    paymentHint: true,
    paymentPriceUSD: 0.02,
    paymentNetworks: [{
      network: "base",
      recipient: "0x0000000000000000000000000000000000000000",
      maxAmountRequired: "2000000",
      asset: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
      type: "evm"
    }]
  },
  {
    id: "getTrends",
    name: "getTrends",
    description: "Retrieve trending topics and hashtags",
    paymentHint: true,
    paymentPriceUSD: 0.01,
    paymentNetworks: [{
      network: "base",
      recipient: "0x0000000000000000000000000000000000000000",
      maxAmountRequired: "1000000",
      asset: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
      type: "evm"
    }]
  },
]

export default function McpExampleCard({
  className,
  serverId,
  ...props
}: McpExampleCardProps) {
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [showToolModal, setShowToolModal] = useState(false)
  const [data, setData] = useState<{
    serverId: string
    origin?: string
    tools: Array<Record<string, unknown>>
    summary?: { totalTools: number; totalRequests: number }
    info?: { name?: string; description?: string }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalRequests, setTotalRequests] = useState<number | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    if (!serverId) {
      setLoading(false)
      setLoadingRequests(false)
      return
    }

    // Fetch server data directly using serverId
    const fetchData = async () => {
      setLoading(true)
      setLoadingRequests(true)
      
      try {
        const serverData = await mcpDataApi.getServerById(serverId)
        setData({
          serverId: serverData.serverId,
          origin: serverData.origin,
          tools: (serverData.tools || []) as Array<Record<string, unknown>>,
          summary: serverData.summary,
          info: serverData.info,
        })
        setTotalRequests(serverData.summary?.totalRequests || 0)
        setLoadingRequests(false)
      } catch (e) {
        console.error('Failed to fetch server data:', e)
        setData(null)
        setTotalRequests(0)
        setLoadingRequests(false)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [serverId])

  // Normalize tools data exactly like server-page-client does
  const normalizedTools = useMemo(() => {
    if (!data?.tools) return []
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
  }, [data?.tools])

  // Get first 5 tools
  const displayTools = useMemo(() => {
    return normalizedTools.slice(0, 5)
  }, [normalizedTools])

  const openToolModal = (tool: typeof normalizedTools[0]) => {
    // Convert normalized tool to format expected by ToolExecutionModal
    // Include payment info in the tool object as the modal expects it
    const toolForModal = {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema || {},
      pricing: tool.pricing || [],
      isMonetized: tool.isMonetized || false,
      paymentHint: tool.paymentHint,
      paymentPriceUSD: tool.paymentPriceUSD,
      paymentNetworks: tool.paymentNetworks,
    } as unknown as ToolFromMcpServerWithStats
    
    setSelectedTool(toolForModal)
    setShowToolModal(true)
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6 rounded-[2px] bg-card p-6", className)} {...props}>
        <div className="inline-flex">
          <HighlighterText className="!text-foreground">SERVER EXAMPLE</HighlighterText>
        </div>

        {/* Image + Title Section */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-4">
            {/* Square black image - bigger with same rounded corners as tools, smaller on mobile */}
            <div className="w-16 h-16 sm:w-40 sm:h-40 bg-black rounded-[2px] flex-shrink-0 flex items-center justify-center p-4 sm:p-12">
              <Image 
                src="/x-logo.svg" 
                alt="X Logo" 
                width={80} 
                height={80} 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Title */}
            <div className="flex flex-col gap-2 sm:gap-4 flex-1">
              <h3 className="text-2xl sm:text-3xl font-bold font-host text-foreground">
                {data?.info?.name || "Loading..."}
              </h3>
              
              {/* Description - hidden on mobile, shown next to title on desktop */}
              <p className="hidden sm:block text-sm sm:text-base text-muted-foreground">
                <span className="text-foreground">Regular subscription</span>{" "}
                <HighlighterText variant="red" className="!text-sm">$200 /month</HighlighterText>{" "}
                <span className="text-foreground">via MCPay</span>{" "}
                <HighlighterText variant="green" className="!text-sm">$0.05 /tool</HighlighterText>
              </p>
            </div>
          </div>
          
          {/* Description - shown below image on mobile */}
          <div className="block sm:hidden text-sm text-muted-foreground mt-4">
            <div>
              <span className="text-foreground">Regular subscription</span>{" "}
              <HighlighterText variant="red">$200 /month</HighlighterText>
            </div>
            <div className="mt-3">
              <span className="text-foreground">via MCPay</span>{" "}
              <HighlighterText variant="green">$0.05 /tool</HighlighterText>
            </div>
          </div>
        </div>

        {/* Tools List - First 5 tools */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tools...</div>
          ) : displayTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tools available</div>
          ) : (
            displayTools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between gap-4 p-4 pr-6 md:pr-4 rounded-[2px] bg-muted-2"
            >
              {/* Left: Name + Description */}
              <div className="flex-1 min-w-0">
                <h4 className="font-mono text-sm font-medium text-foreground mb-1">{tool.name}</h4>
                {tool.description && (
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                )}
              </div>
              
              {/* Right: Price + RUN Button */}
              <div className="flex items-center gap-2 shrink-0">
                {tool.paymentHint && tool.paymentPriceUSD && (
                  <HighlighterText variant="blue">${tool.paymentPriceUSD}</HighlighterText>
                )}
                <Button
                  variant="customTallAccent"
                  size="sm"
                  className="h-8 rounded-[2px]"
                  onClick={() => openToolModal(tool)}
                >
                  RUN
                </Button>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Text + Buttons Section */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          <p className="font-inter font-medium leading-relaxed text-lg text-left lg:max-w-[50%]">
            <span className="text-foreground">Consume any paid MCP server with a single account.</span>{" "}
            <span className="text-muted-foreground">Pay per tool call, no subscriptions required.</span>
          </p>
          <div className="flex flex-col lg:flex-row gap-4 lg:max-w-[50%] lg:flex-1">
            {data?.serverId && (
              <Link 
                href={`/servers/${data.serverId}`}
                className="w-full lg:flex-1 block"
              >
                <Button variant="customTallSecondary" size="tall" className="w-full rounded-[2px]">
                  SERVER DETAILS
                </Button>
              </Link>
            )}
            <Button
              variant="customTallAccentAmber"
              size="tall"
              className="w-full lg:flex-1 rounded-[2px]"
              onClick={() => {
                if (data?.origin) {
                  const url = urlUtils.getMcpUrl(data.origin)
                  navigator.clipboard.writeText(url)
                  toast.success("Copied MCP endpoint to clipboard")
                } else {
                  toast.error("Server URL not available")
                }
              }}
            >
              <PlugZap className="size-4 mr-2" />
              CONNECT
            </Button>
          </div>
        </div>
      </div>

      {/* Tool Execution Modal */}
      {selectedTool && (
        <ToolExecutionModal
          isOpen={showToolModal}
          onClose={() => {
            setShowToolModal(false)
            setSelectedTool(null)
          }}
          tool={selectedTool}
          serverId={data?.serverId || ""}
        />
      )}
    </>
  )
}

