"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2 } from "lucide-react"

type ServerHeaderProps = {
  name: string
  description?: string
  origin?: string
  onExplore?: () => void
  isVerified?: boolean
}

export function ServerHeader({ name, description, origin, onExplore, isVerified }: ServerHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-semibold font-host">{name}</h1>
            {isVerified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </TooltipTrigger>
                  <TooltipContent>Verified server</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!!description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {origin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-mono text-sm text-muted-foreground cursor-help hover:underline mt-1">
                    {(() => {
                      try {
                        const url = new URL(origin)
                        return url.hostname
                      } catch {
                        return origin
                      }
                    })()}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{origin}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onExplore}>
            Explore capabilities
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ServerHeader


