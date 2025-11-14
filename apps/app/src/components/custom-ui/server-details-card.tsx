"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-context"
import { RefreshCcw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ServerDetails = {
  deploymentRef?: string
  license?: string
  isLocal?: boolean
  publishedAt?: string
  repo?: string
  homepage?: string
}

function DetailRow({ label, value, href, isLast }: { label: string; value?: string | boolean; href?: string; isLast?: boolean }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : (value || "-")
  const displayUppercase = typeof display === "string" ? display.toUpperCase() : display
  return (
    <div className={isLast ? "flex items-center justify-between pt-2 pb-0" : "flex items-center justify-between py-2"}>
      <span className="text-xs tracking-wider text-muted-foreground font-mono uppercase">{label}</span>
      {href && value ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-xs tracking-wider font-mono underline uppercase">
          {displayUppercase}
        </a>
      ) : (
        <span className="text-xs tracking-wider font-mono text-foreground uppercase">{displayUppercase}</span>
      )}
    </div>
  )
}

export function ServerDetailsCard({ 
  details, 
  onRefresh, 
  isRefreshing = false 
}: { 
  details: ServerDetails
  onRefresh?: () => void
  isRefreshing?: boolean
}) {
  const { isDark } = useTheme()

  return (
    <div className="rounded-[2px] bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase font-mono tracking-wider">DETAILS</span>
        {onRefresh && (
          <div 
            className={cn(
              "inline-flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide bg-muted text-muted-foreground size-6 rounded-[2px] transition-colors cursor-pointer",
              isRefreshing ? "opacity-50 cursor-not-allowed" : "hover:text-foreground"
            )}
            onClick={isRefreshing ? undefined : onRefresh}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
      <div>
        <DetailRow label="Deployed from" value={details.deploymentRef} />
        <DetailRow label="License" value={details.license} />
        <DetailRow label="Local" value={details.isLocal} />
        <DetailRow label="Published" value={details.publishedAt} />
        <DetailRow label="Source Code" value={details.repo ? "Open" : undefined} href={details.repo} />
        <DetailRow label="Homepage" value={details.homepage ? details.homepage : undefined} href={details.homepage} isLast />
      </div>
    </div>
  )
}

export default ServerDetailsCard


