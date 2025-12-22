"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import Logo3D from "./logo-3d"
import { ArrowUpRight } from "lucide-react"
import {
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import { easeOut } from "motion"

const SUPPORTED_BY_LOGOS = [
  {
    name: "colosseum",
    href: "https://blog.colosseum.com/announcing-colosseums-accelerator-cohort-4/",
    src: "/colosseum-logo-white.svg",
  },
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
    case "colosseum":
      return { className: "h-6 w-[120px]", width: 120, height: 24 }
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

const renderLogo = (logo: typeof SUPPORTED_BY_LOGOS[number], index?: number) => {
  const logoSize = getLogoSize(logo.name)
  return (
    <Link
      key={`${logo.name}-${index ?? ''}`}
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0"
    >
      <div
        className={cn(
          "h-10 px-4 flex items-center justify-center rounded-[2px] transition-all duration-300 min-w-[140px] w-full relative overflow-hidden",
          logo.name === "colosseum" 
            ? "bg-[#1C2123] dark:bg-[#D8DDDF] group-hover:opacity-90"
            : "bg-muted/50 group-hover:bg-muted"
        )}
      >
        <span className="relative inline-flex items-center transition-transform duration-300 ease-out group-hover:-translate-x-1">
          <div
            className={cn(
              "transition-all duration-300",
              logoSize.className,
              logo.name === "colosseum"
                ? "[background-color:var(--background)] dark:[background-color:var(--background)]"
                : "opacity-70 group-hover:opacity-100 [background-color:var(--foreground)]"
            )}
            style={getMaskStyle(logo.src)}
          />
          <ArrowUpRight 
            className={cn(
              "absolute left-full ml-2 h-3.5 w-3.5 shrink-0 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0",
              logo.name === "colosseum"
                ? "[color:var(--background)] dark:[color:var(--background)]"
                : "text-foreground"
            )}
          />
        </span>
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
}

export function SupportedBySection() {
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
    <motion.section
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-16"
      initial="hidden"
      animate={isMounted ? "visible" : "hidden"}
      variants={fadeUp}
    >
      <div className="flex flex-col items-start space-y-4">
        <HighlighterText>BACKED BY</HighlighterText>
        
        {/* Desktop: grid layout - equal width logos */}
        <div className="hidden md:grid md:grid-cols-5 gap-3 w-full">
          {SUPPORTED_BY_LOGOS.map((logo) => renderLogo(logo))}
        </div>

        {/* Mobile: grid layout - 2 columns, Colosseum spans full width */}
        <div className="md:hidden grid grid-cols-2 gap-3 w-full mt-4">
          {SUPPORTED_BY_LOGOS.map((logo, index) => (
            <div
              key={logo.name}
              className={logo.name === "colosseum" ? "col-span-2" : ""}
            >
              {renderLogo(logo)}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

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
        {/* Heading and Subheading - Mobile */}
        <motion.div
          className="flex flex-col gap-1 order-1 lg:hidden"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <h1 className="text-3xl sm:text-3xl lg:text-4xl font-semibold font-host text-foreground leading-tight">
            The best way for AI to access and pay for online services
          </h1>
          <p className="text-sm sm:text-lg text-foreground/80 leading-relaxed max-w-lg">
            Single connection to use paid MCP tools across any client. Pay-per-use instead of expensive subscriptions.
          </p>
        </motion.div>

        {/* 3D Container - Mobile */}
        <div className="order-2 lg:hidden">
          <Logo3D className="h-[300px] min-h-0" delay={prefersReduced ? 0 : 0.4} duration={prefersReduced ? 0 : 1.2} />
        </div>

        {/* CTAs - Mobile */}
        <motion.div
          className="flex flex-col gap-4 pt-2 order-3 lg:hidden -mx-4 px-4"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <Link href="/servers" className="w-full">
            <Button variant="customTallPrimary" size="tall" animated className="w-full px-3 lg:px-6">
              BROWSE SERVERS
            </Button>
          </Link>
          <Link href="/register" className="w-full">
            <Button variant="customTallSecondary" size="tall" animated className="w-full px-3 lg:px-6">
              MONETIZE SERVERS
            </Button>
          </Link>
        </motion.div>

        {/* Stats - Mobile (moved to bottom) */}
        <motion.div
          className="flex flex-wrap gap-3 order-4 lg:hidden text-muted-foreground font-mono text-sm tracking-wider uppercase"
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <span>TRANSACTIONS: <span className="!text-foreground font-medium">+100,000</span></span>
          <span>VOLUME: <span className="!text-foreground font-medium">+$30,000</span></span>
        </motion.div>

        {/* Desktop Layout - Left Column */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:gap-24 lg:order-1 lg:col-span-1 lg:h-full">
          {/* Main Content - Top Aligned */}
          <motion.div
            className="flex flex-col space-y-3 max-w-lg"
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={fadeUp}
          >
            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold font-host text-foreground leading-tight">
              The best way for AI to access and pay for online services
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
              Single connection to use paid MCP tools across any client.<br />
              Pay-per-use instead of expensive subscriptions.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-6">
              <Link href="/servers" className="flex-1 lg:flex-none">
                <Button variant="customTallPrimary" size="tall" animated className="w-full min-w-[220px]">
                  BROWSE SERVERS
                </Button>
              </Link>
              <Link href="/register" className="flex-1 lg:flex-none">
                <Button variant="customTallSecondary" size="tall" animated className="w-full min-w-[220px]">
                  MONETIZE SERVERS
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats - Bottom Aligned */}
          <motion.div
            className="flex flex-wrap gap-3 text-muted-foreground font-mono text-sm tracking-wider uppercase"
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={fadeUp}
          >
            <span>TRANSACTIONS: <span className="text-foreground font-medium">+100,000</span></span>
            <span>VOLUME: <span className="text-foreground font-medium">+$30,000</span></span>
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

