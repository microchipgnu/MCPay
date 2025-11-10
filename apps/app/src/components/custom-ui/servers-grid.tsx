"use client"

import { McpServer } from "@/lib/client/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { urlUtils } from "@/lib/client/utils"
import { Check, CheckCircle2, Copy } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
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
  const url = urlUtils.getMcpUrl(server.origin)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Copied MCP endpoint to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/servers/${server.id}`} className="group">
      <Card className="p-6 rounded-lg bg-card hover:shadow-lg hover:border-teal-700 dark:hover:border-teal-200 border border-transparent transition-all duration-300 cursor-pointer">
        <CardHeader className="p-0 mb-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{server?.server?.info?.name || "Unknown Server"}</CardTitle>
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
        </CardHeader>

        <CardContent className="p-0">
          {/* Tools with HighlighterText */}
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex">
              <HighlighterText>
                TOOLS: <span className="!text-foreground">{server.tools.length}</span>
              </HighlighterText>
            </div>
          </div>

          {/* URL with label + copy */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                Connection URL
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  handleCopy()
                }}
                className="h-6 w-6 rounded-sm cursor-pointer"
              >
                {copied ? <Check className="size-3 stroke-[2.5]" /> : <Copy className="size-3 stroke-[2.5]" />}
              </Button>
            </div>
            <div className="p-2 px-3 rounded-md bg-muted-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <code className="text-xs font-mono whitespace-nowrap block">
                {url}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ServerSkeletonCard() {
  return (
    <Card className="p-6 rounded-lg bg-card space-y-4">
      <div>
        <Skeleton className="h-5 w-3/4 mb-4" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-[2px]" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6 rounded-sm" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </Card>
  )
}
