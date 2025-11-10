import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface HighlighterTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  icon?: LucideIcon
}

export default function HighlighterText({
  children,
  className,
  icon: Icon,
  ...props
}: HighlighterTextProps) {
  if (Icon) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <div
          className={cn(
            "flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide",
            "bg-muted text-muted-foreground",
            "size-6 rounded-[2px]"
          )}
        >
          <Icon className="size-4" />
        </div>
        <div
          className={cn(
            "inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide",
            "bg-muted text-muted-foreground",
            "px-2 py-1 rounded-[2px]",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide",
        "bg-muted text-muted-foreground",
        "px-2 py-1 rounded-[2px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

