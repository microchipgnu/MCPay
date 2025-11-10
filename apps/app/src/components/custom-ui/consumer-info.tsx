"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import InfoCard from "./info-card"
import { BookOpen } from "lucide-react"

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
            <HighlighterText>FOR BUSINESSES & DEVELOPERS</HighlighterText>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight max-w-3xl">
            The AI Gateway for your app.{" "}
            <span className="font-normal text-muted-foreground">Get discovered and paid by any AI client.</span>
          </h2>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoCard
            icon={BookOpen}
            label="OPEN SOURCE"
            copy="Built in public, forever auditable. Developers can self-host, extend, or fork, no hidden middle layer."
            ctaText="SOURCE CODE"
            ctaHref="https://github.com"
          />
          <InfoCard
            icon={BookOpen}
            label="OPEN SOURCE"
            copy="Built in public, forever auditable. Developers can self-host, extend, or fork, no hidden middle layer."
            ctaText="SOURCE CODE"
            ctaHref="https://github.com"
          />
          <InfoCard
            icon={BookOpen}
            label="OPEN SOURCE"
            copy="Built in public, forever auditable. Developers can self-host, extend, or fork, no hidden middle layer."
            ctaText="SOURCE CODE"
            ctaHref="https://github.com"
          />
        </div>

        {/* Primary CTA */}
        <div className="flex justify-center">
          <Link href="/monetize" className="w-full lg:w-auto">
            <Button variant="customTallPrimary" size="tall" className="w-full lg:min-w-[220px]">
              MONETIZE SERVERS
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

