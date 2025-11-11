"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import StatsCard from "./stats-card"
import MinimalExplorer from "./minimal-explorer"

interface StatsProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

export default function Stats({
  className,
  ...props
}: StatsProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-medium font-host text-muted-foreground leading-tight">
            Latest Transactions
          </h2>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="TRANSACTIONS" value="+ 100,000" />
            <StatsCard label="VOLUME" value="+ $30,000" />
            <StatsCard label="USERS" value="+ 2,500" />
          </div>

          {/* Minimal Explorer Card */}
          <div className="rounded-lg bg-card py-2">
            <MinimalExplorer />
          </div>
        </div>

        {/* Explorer CTA */}
        <div className="flex justify-center">
          <Link href="/explorer" className="w-full lg:w-auto">
            <Button variant="customTallPrimary" size="tall" className="w-full lg:min-w-[220px]">
              EXPLORER
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

