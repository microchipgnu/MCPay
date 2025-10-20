"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ServerHeaderProps = {
  name: string
  description?: string
  origin?: string
  onExplore?: () => void
}

export function ServerHeader({ name, description, origin, onExplore }: ServerHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold font-host mb-1">{name}</h1>
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


