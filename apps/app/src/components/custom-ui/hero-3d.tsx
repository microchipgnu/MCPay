"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import Logo3D from "./logo-3d"
import {
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import { easeOut } from "motion"

const SUPPORTED_BY_LOGOS = [
  {
    name: "coinbase",
    href: "https://www.coinbase.com/developer-platform/discover/launches/summer-builder-grants",
    src: "/logos/coinbase-logo.svg",
  },
  {
    name: "polygon",
    href: "https://x.com/0xPolygonEco/status/1981060080058716289",
    src: "/logos/polygon-logo.svg",
  },
  {
    name: "vlayer",
    href: "https://vlayer.xyz/",
    src: "/logos/vlayer-logo.svg",
  },
  {
    name: "ethglobal",
    href: "https://www.youtube.com/watch?v=0oi8ZEPILaI",
    src: "/logos/ETHGlobal.svg",
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
    case "ethglobal":
      return { className: "h-5 w-[90px]", width: 80, height: 20 }
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
  const prefersReduced = useReducedMotion()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const fadeUp: Variants = React.useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0 : 0.4, ease: easeOut },
      },
    }),
    [prefersReduced]
  )

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
        <motion.div
          className="flex flex-wrap gap-3 order-1 lg:hidden"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <HighlighterText>
            TRANSACTIONS: <span className="!text-foreground">+ 100,000</span>
          </HighlighterText>
          <HighlighterText>
            VOLUME: <span className="!text-foreground">+ $30,000</span>
          </HighlighterText>
        </motion.div>

        {/* Heading and Subheading - Mobile */}
        <motion.div
          className="flex flex-col gap-1 order-2 lg:hidden"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <h1 className="text-3xl sm:text-3xl lg:text-4xl font-bold font-host text-foreground leading-tight">
            Pay cents per tool call instead of subscriptions
          </h1>
          <p className="text-sm sm:text-lg text-foreground/80 leading-relaxed max-w-lg">
            Single connection to use paid MCP tools across any client.<br />
            Pay-per-use instead of expensive subscriptions.
          </p>
        </motion.div>

        {/* 3D Container - Mobile */}
        <div className="order-4 lg:hidden">
          <Logo3D className="h-[300px] min-h-0" delay={prefersReduced ? 0 : 0.4} duration={prefersReduced ? 0 : 1.2} />
        </div>

        {/* CTAs - Mobile */}
        <motion.div
          className="flex gap-4 pt-2 order-5 lg:hidden -mx-4 px-4"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <Link href="/servers" className="flex-1 min-w-0">
            <Button variant="customTallPrimary" size="tall" className="w-full px-3 lg:px-6">
              BROWSE SERVERS
            </Button>
          </Link>
          <Link href="/register" className="flex-1 min-w-0">
            <Button variant="customTallSecondary" size="tall" className="w-full px-3 lg:px-6">
              MONETIZE SERVERS
            </Button>
          </Link>
        </motion.div>

        {/* Supported By Section - Mobile */}
        <motion.div
          className="space-y-4 order-6 lg:hidden"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
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
        </motion.div>

        {/* Desktop Layout - Left Column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:gap-24 lg:order-1 lg:col-span-1 lg:h-full">
          {/* Stats */}
          <motion.div
            className="flex flex-wrap gap-3"
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={fadeUp}
          >
            <HighlighterText>
              TRANSACTIONS: <span className="text-foreground">+ 100,000</span>
            </HighlighterText>
            <HighlighterText>
              VOLUME: <span className="text-foreground">+ $30,000</span>
            </HighlighterText>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="flex-1 flex flex-col justify-center space-y-3 max-w-lg"
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={fadeUp}
          >
            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-host text-foreground leading-tight">
              Pay cents per tool call instead of subscriptions
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
              Single connection to use paid MCP tools across any client.<br />
              Pay-per-use instead of expensive subscriptions.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/servers" className="flex-1 lg:flex-none">
                <Button variant="customTallPrimary" size="tall" className="w-full min-w-[220px]">
                  BROWSE SERVERS
                </Button>
              </Link>
              <Link href="/register" className="flex-1 lg:flex-none">
                <Button variant="customTallSecondary" size="tall" className="w-full min-w-[220px]">
                  MONETIZE SERVERS
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Supported By Section */}
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={fadeUp}
          >
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
                        logo.name === "coinbase" ? "h-7 w-[70px]" : logo.name === "polygon" ? "h-8 w-[80px]" : logo.name === "vlayer" ? "h-6 w-[60px]" : logo.name === "ethglobal" ? "h-5 w-[80px]" : "h-12 w-[160px]",
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
                      width={logo.name === "coinbase" ? 35 : logo.name === "polygon" ? 45 : logo.name === "vlayer" ? 40 : logo.name === "ethglobal" ? 40 : 80}
                      height={logo.name === "coinbase" ? 14 : logo.name === "polygon" ? 18 : logo.name === "vlayer" ? 16 : logo.name === "ethglobal" ? 10 : 32}
                      className="sr-only"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Desktop Layout - Right Column - 3D Container */}
        <div className="hidden lg:block lg:order-2 lg:col-span-1 lg:h-full">
          <Logo3D className="h-full" delay={prefersReduced ? 0 : 0.4} duration={prefersReduced ? 0 : 1.2} />
        </div>
      </div>
    </section>
  )
}

