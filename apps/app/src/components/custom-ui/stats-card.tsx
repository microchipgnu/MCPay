import * as React from "react"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
}

export default function StatsCard({
  label,
  value,
  className,
  ...props
}: StatsCardProps) {
  // Format value: separate "+" for muted color and add tighter tracking around commas
  const parts = value.split(/(\+|\s)/)
  const formattedValue = parts.map((part, index) => {
    if (part === '+') {
      return <span key={index} className="text-muted-foreground">+</span>
    }
    if (part === ' ') {
      return <React.Fragment key={index}> </React.Fragment>
    }
    // Split by comma and add tighter tracking
    return part.split(/(,)/).map((subPart, subIndex) => {
      if (subPart === ',') {
        return <span key={`${index}-${subIndex}`} className="tracking-tighter">,</span>
      }
      return <React.Fragment key={`${index}-${subIndex}`}>{subPart}</React.Fragment>
    })
  })

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-6 rounded-lg bg-card",
        className
      )}
      {...props}
    >
      <div className="inline-flex">
        <HighlighterText className="!text-foreground">{label}</HighlighterText>
      </div>
      <div className="font-mono text-foreground text-[2.5rem] font-normal leading-none">
        {formattedValue}
      </div>
    </div>
  )
}

