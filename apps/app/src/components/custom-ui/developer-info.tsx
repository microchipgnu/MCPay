"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import InfoCard from "./info-card"
import VisualProxy from "./visual-proxy"
import { PackageOpen, ShieldCheck, Earth } from "lucide-react"

interface DeveloperInfoProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

export default function DeveloperInfo({
  className,
  ...props
}: DeveloperInfoProps) {
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
            <HighlighterText>FOR BUSINESSES & DEVELOPERS</HighlighterText>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight max-w-3xl">
            The AI Gateway for your app.{" "}
            <span className="font-normal text-muted-foreground">Get discovered and paid by any AI client.</span>
          </h2>
        </div>

        {/* Visual Proxy */}
        <VisualProxy />

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoCard
            icon={PackageOpen}
            label="OPEN SOURCE"
            copy="Forever free. No fees. Developers can audit the entire code."
            ctaText="SOURCE CODE"
            ctaHref="https://github.com"
          />
          <InfoCard
            icon={ShieldCheck}
            label="NON INTRUSIVE"
            copy="Wraps around your MCP/API so you can start charging with no refactor."
          />
          <InfoCard
            icon={Earth}
            label="MULTICHAIN"
            copy={
              <>
                Works across all major EVM networks{" "}
                <span className="text-muted-foreground">(Base, Avalanche, Polygon, Iotex and Sei)</span> and Solana.
              </>
            }
          />
        </div>
      </div>
    </section>
  )
}

