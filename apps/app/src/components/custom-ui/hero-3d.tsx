"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import Logo3D from "./logo-3d"

const SUPPORTED_BY_LOGOS = [
  {
    name: "coinbase",
    href: "https://www.coinbase.com/",
    src: "/logos/coinbase-logo.svg",
  },
  {
    name: "polygon",
    href: "https://polygon.technology/",
    src: "/logos/polygon-logo.svg",
  },
  {
    name: "vlayer",
    href: "https://vlayer.com/",
    src: "/logos/vlayer-logo.svg",
  },
] as const

// Helper functions for logo sizing
const getLogoSize = (name: string) => {
  switch (name) {
    case "coinbase":
      return { className: "h-7 w-[70px]", width: 70, height: 28 }
    case "polygon":
      return { className: "h-8 w-[80px]", width: 80, height: 32 }
    case "vlayer":
      return { className: "h-6 w-[60px]", width: 60, height: 24 }
    default:
      return { className: "h-12 w-[160px]", width: 160, height: 64 }
  }
}

const getMaskStyle = (src: string): React.CSSProperties => ({
  maskImage: `url(${src})`,
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskImage: `url(${src})`,
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
})

export default function Hero3D({
  className,
}: {
  className?: string
}) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-24",
        className
      )}
    >
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 lg:items-stretch lg:min-h-[600px]">
        {/* Mobile Layout */}
        {/* Stats */}
        <div className="flex flex-wrap gap-3 order-1 lg:hidden">
          <HighlighterText>
            TRANSACTIONS: <span className="text-white">+ 100K</span>
          </HighlighterText>
          <HighlighterText>
            VOLUME: <span className="text-white">+ 100K</span>
          </HighlighterText>
        </div>

        {/* Heading and Subheading - Mobile */}
        <div className="flex flex-col gap-1 order-2 lg:hidden">
          <h1 className="text-3xl sm:text-3xl lg:text-4xl font-bold font-host text-foreground leading-tight">
            Payments infrastructure for the agent economy
          </h1>
          <p className="text-sm sm:text-lg text-foreground/80 leading-relaxed max-w-lg">
            In one minute, add our open-source proxy to your APIs or MCPs and get discovered and paid by autonomous agents.
          </p>
        </div>

        {/* 3D Container - Mobile */}
        <div className="order-4 lg:hidden">
          <Logo3D className="h-[300px] min-h-0" />
        </div>

        {/* CTAs - Mobile */}
        <div className="flex gap-4 pt-2 order-5 lg:hidden -mx-4 px-4">
          <Link href="/monetize" className="flex-1 min-w-0">
            <Button variant="customTallPrimary" size="tall" className="w-full px-3 lg:px-6">
              MONETIZE SERVERS
            </Button>
          </Link>
          <Link href="https://docs.mcpay.tech" target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
            <Button variant="customTallSecondary" size="tall" className="w-full px-3 lg:px-6">
              DOCUMENTATION
            </Button>
          </Link>
        </div>

        {/* Supported By Section - Mobile */}
        <div className="space-y-4 order-6 lg:hidden">
          <HighlighterText>SUPPORTED BY</HighlighterText>
          <div className="flex flex-wrap gap-3">
            {SUPPORTED_BY_LOGOS.map((logo) => {
              const logoSize = getLogoSize(logo.name)
              return (
                <Link
                  key={logo.name}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div
                    className={cn(
                      "h-8 px-4 flex items-center justify-center rounded-[2px] transition-all duration-300",
                      "bg-muted/50",
                      "group-hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "transition-all duration-300",
                        logoSize.className,
                        "opacity-70 group-hover:opacity-100",
                        "[background-color:var(--foreground)]"
                      )}
                      style={getMaskStyle(logo.src)}
                    />
                    <Image
                      src={logo.src}
                      alt={`${logo.name} logo`}
                      width={logoSize.width}
                      height={logoSize.height}
                      className="sr-only"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Desktop Layout - Left Column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:gap-24 lg:order-1 lg:col-span-1 lg:h-full">
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <HighlighterText>
              TRANSACTIONS: <span className="text-white">+ 100K</span>
            </HighlighterText>
            <HighlighterText>
              VOLUME: <span className="text-white">+ 100K</span>
            </HighlighterText>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center space-y-3 max-w-lg">
            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-host text-foreground leading-tight">
              Payments infrastructure for the agent economy
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
              In one minute, add our open-source proxy to your APIs or MCPs and get discovered and paid by autonomous agents.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/monetize" className="flex-1 lg:flex-none">
                <Button variant="customTallPrimary" size="tall" className="w-full min-w-[220px]">
                  MONETIZE SERVERS
                </Button>
              </Link>
              <Link href="https://docs.mcpay.tech" target="_blank" rel="noopener noreferrer" className="flex-1 lg:flex-none">
                <Button variant="customTallSecondary" size="tall" className="w-full min-w-[220px]">
                  DOCUMENTATION
                </Button>
              </Link>
            </div>
          </div>

          {/* Supported By Section */}
          <div className="space-y-4">
            <HighlighterText>SUPPORTED BY</HighlighterText>
            <div className="flex flex-wrap gap-3">
              {SUPPORTED_BY_LOGOS.map((logo) => (
                <Link
                  key={logo.name}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div
                    className={cn(
                      "h-8 px-4 flex items-center justify-center rounded-[2px] transition-all duration-300",
                      "bg-muted/50",
                      "group-hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "transition-all duration-300",
                        logo.name === "coinbase" ? "h-7 w-[70px]" : logo.name === "polygon" ? "h-8 w-[80px]" : logo.name === "vlayer" ? "h-6 w-[60px]" : "h-12 w-[160px]",
                        "opacity-70 group-hover:opacity-100",
                        "[background-color:var(--foreground)]"
                      )}
                      style={{
                        maskImage: `url(${logo.src})`,
                        maskSize: "contain",
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskImage: `url(${logo.src})`,
                        WebkitMaskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center"
                      }}
                    />
                    <Image
                      src={logo.src}
                      alt={`${logo.name} logo`}
                      width={logo.name === "coinbase" ? 35 : logo.name === "polygon" ? 45 : logo.name === "vlayer" ? 40 : 80}
                      height={logo.name === "coinbase" ? 14 : logo.name === "polygon" ? 18 : logo.name === "vlayer" ? 16 : 32}
                      className="sr-only"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Layout - Right Column - 3D Container */}
        <div className="hidden lg:block lg:order-2 lg:col-span-1 lg:h-full">
          <Logo3D className="h-full" />
        </div>
      </div>
    </section>
  )
}

