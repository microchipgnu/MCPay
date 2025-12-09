"use client"

import { McpServer, mcpDataApi } from "@/lib/client/utils"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { urlUtils } from "@/lib/client/utils"
import { CheckCircle2, Copy, PlugZap } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import HighlighterText from "./highlighter-text"

export default function ServersGrid({
  servers,
  loading = false,
  className = "", // NEW
}: {
  servers: McpServer[]
  loading?: boolean
  className?: string // NEW
}) {
  const skeletonCount = 6

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto ${className}`}
    >
      <TooltipProvider>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <ServerSkeletonCard key={idx} />
            ))
          : servers.map((server) => <ServerCard key={server.id} server={server} />)}
      </TooltipProvider>
    </div>
  )
}

function ServerCard({ server }: { server: McpServer }) {
  const [copied, setCopied] = useState(false)
  const [totalRequests, setTotalRequests] = useState<number | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const url = urlUtils.getMcpUrl(server.origin)

  useEffect(() => {
    // Fetch requests count for this server
    setLoadingRequests(true)
    mcpDataApi.getServerById(server.id)
      .then((data) => {
        setTotalRequests(data.summary?.totalRequests || 0)
      })
      .catch(() => {
        // Silently fail - keep showing 0 or null
        setTotalRequests(0)
      })
      .finally(() => {
        setLoadingRequests(false)
      })
  }, [server.id])

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Copied MCP endpoint to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/servers/${server.id}`} className="block">
      <Card className="p-4 rounded-[2px] bg-card hover:shadow-lg hover:border-foreground/70 border border-transparent transition-all duration-300 gap-0">
        <div className="flex items-center gap-2 mb-4">
          <CardTitle className="text-lg mb-0 pb-0 leading-none">{server?.server?.info?.name || "Unknown Server"}</CardTitle>
          {server.moderation_status === 'approved' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CheckCircle2 className="h-4 w-4 text-teal-700 dark:text-teal-200" />
                </TooltipTrigger>
                <TooltipContent>Verified server</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2 mb-12">
          <HighlighterText>
            <span className="text-foreground">{server.tools.length}</span>
            <span className="ml-1">TOOLS</span>
          </HighlighterText>
          {loadingRequests ? (
            <HighlighterText className="flex items-center gap-2">
              <Spinner className="size-3" />
              REQUESTS
            </HighlighterText>
          ) : (
            <HighlighterText>
              <span className="text-foreground">{totalRequests !== null ? totalRequests : 0}</span>
              <span className="ml-1">REQUESTS</span>
            </HighlighterText>
          )}
        </div>

        <Button
          variant="customTallAccentAmber"
          size="xs"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCopy()
          }}
          className="w-auto self-start justify-start rounded-[2px] text-xs !px-2 tracking-wider border-0"
        >
          <PlugZap className="size-4" />
          CONNECT
        </Button>
      </Card>
    </Link>
  )
}

function ServerSkeletonCard() {
  return (
    <Card className="p-4 rounded-[2px] bg-card gap-0">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      <div className="flex items-center gap-2 mb-12">
        <Skeleton className="h-6 w-16 rounded-[2px]" />
        <Skeleton className="h-6 w-20 rounded-[2px]" />
      </div>

      <Skeleton className="h-7 w-24 rounded-[2px]" />
    </Card>
  )
}
