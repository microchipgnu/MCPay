import * as React from "react"
import { cn } from "@/lib/utils"

interface HighlighterTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export default function HighlighterText({
  children,
  className,
  ...props
}: HighlighterTextProps) {
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

