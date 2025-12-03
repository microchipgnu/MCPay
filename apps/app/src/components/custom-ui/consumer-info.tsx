"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import InfoCard from "./info-card"
import { ChartLine, DoorOpen, PiggyBank } from "lucide-react"
import McpExampleCard from "./mcp-example-card"

interface ConsumerInfoProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

export default function ConsumerInfo({
  className,
  ...props
}: ConsumerInfoProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-12">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="inline-flex">
            <HighlighterText>CONSUME MCP SERVERS</HighlighterText>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight max-w-4xl">
            Pay cents per tool call.{" "}
            <span className="font-normal text-muted-foreground">Instead of expensive subscriptions. Consume any paid MCP with a single account.</span>
          </h2>
        </div>

        {/* MCP Example Card */}
        <McpExampleCard serverId="d534ddca-b113-4807-9f9f-e28f74f2cc49" />

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoCard
            icon={ChartLine}
            label="USAGE BASED"
            copy="Forget subscriptions and pay only for what you use. Pay per tool call."
          />
          <InfoCard
            icon={DoorOpen}
            label="NO LOCK IN"
            copy="Withdraw your funds at anytime."
          />
          <InfoCard
            icon={PiggyBank}
            label="FREE"
            copy="We don't charge any fees, you are paying cents for each tool call."
          />
        </div>
      </div>
    </section>
  )
}

