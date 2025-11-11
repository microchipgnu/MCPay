"use client"

import * as React from "react"
import { forwardRef, useRef, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import HighlighterText from "./highlighter-text"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Smile } from "lucide-react"

interface VisualProxyProps extends React.HTMLAttributes<HTMLDivElement> {}

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; backgroundColor?: string; padding?: string }
>(({ className, children, backgroundColor = "white", padding = "p-3" }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-20 flex size-12 items-center justify-center rounded-full",
        padding,
        className
      )}
      style={{ backgroundColor }}
    >
      {children}
    </div>
  )
})
Circle.displayName = "Circle"

const Square = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-20 flex size-24 items-center justify-center rounded-lg p-3",
        "bg-[#E1EEEE] dark:bg-[#1A3938]",
        className
      )}
    >
      {children}
    </div>
  )
})
Square.displayName = "Square"

const AI_CLIENTS_CONFIG = [
  {
    name: "ChatGPT",
    icon: "/logos/mcp-clients/OpenAI-black-monoblossom.svg",
    backgroundColor: "#FFFFFF",
    logoColor: "default",
    iconSize: 32,
    padding: "p-2",
  },
  {
    name: "Cursor",
    icon: "/logos/mcp-clients/cursor-cube.svg",
    backgroundColor: "#F6F6F2",
    logoColor: "default",
  },
  {
    name: "Claude",
    icon: "/logos/mcp-clients/claude.svg",
    backgroundColor: "#D97757",
    logoColor: "default",
  },
  {
    name: "Replicate",
    icon: "/logos/mcp-clients/replicate.svg",
    backgroundColor: "#D83D23",
    logoColor: "white",
  },
  {
    name: "Grok",
    icon: "/logos/mcp-clients/Grok_Logomark_Light.svg",
    backgroundColor: "#000000",
    logoColor: "default",
  },
]

export default function VisualProxy({
  className,
  ...props
}: VisualProxyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const mcpayRef = useRef<HTMLDivElement>(null)
  const chatgptRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const claudeRef = useRef<HTMLDivElement>(null)
  const replicateRef = useRef<HTMLDivElement>(null)
  const grokRef = useRef<HTMLDivElement>(null)

  const clientRefs = [chatgptRef, cursorRef, claudeRef, replicateRef, grokRef]

  const clientDelays = useMemo(() => {
    return AI_CLIENTS_CONFIG.map(() => ({
      forward: Math.random() * 0.5,
      reverse: Math.random() * 0.5 + 2.5,
    }))
  }, [])

  return (
    <div
      className={cn(
        "flex flex-col gap-12 rounded-lg bg-card p-6",
        className
      )}
      {...props}
    >
      <div className="inline-flex">
        <HighlighterText className="!text-foreground">MCPAY PROXY</HighlighterText>
      </div>
      
      <div
        ref={containerRef}
        className="relative flex h-[400px] w-full items-center justify-center overflow-hidden px-4 sm:px-10 mb-6"
      >
        <div className="flex max-w-4xl w-full h-full flex-row items-stretch justify-between gap-4 sm:gap-10 mx-auto">
          <TooltipProvider>
            <div className="flex flex-col justify-center relative z-20">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative z-20">
                    <Circle ref={userRef}>
                      <Smile className="w-6 h-6 text-black" />
                    </Circle>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your app</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col justify-center relative z-20">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative z-20">
                    <Square ref={mcpayRef}>
                      <div
                        className="bg-teal-700 dark:bg-teal-200"
                        style={{
                          width: "52px",
                          height: "52px",
                          maskImage: "url(/MCPay-icon.svg)",
                          maskSize: "contain",
                          maskRepeat: "no-repeat",
                          maskPosition: "center",
                          WebkitMaskImage: "url(/MCPay-icon.svg)",
                          WebkitMaskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                        }}
                      />
                    </Square>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>MCPay Proxy: we handle x402 payments and discoverability, you just get paid.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="flex flex-col justify-center gap-4">
            {AI_CLIENTS_CONFIG.map((client, index) => {
              const iconSize = client.iconSize || 24
              return (
                <Circle key={client.name} ref={clientRefs[index]} backgroundColor={client.backgroundColor} padding={client.padding}>
                  {client.logoColor === "white" ? (
                    <div
                      style={{
                        width: `${iconSize}px`,
                        height: `${iconSize}px`,
                        maskImage: `url(${client.icon})`,
                        maskSize: "contain",
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskImage: `url(${client.icon})`,
                        WebkitMaskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        backgroundColor: "white",
                      }}
                    />
                  ) : (
                    <Image
                      src={client.icon}
                      alt={client.name}
                      width={iconSize}
                      height={iconSize}
                      className="object-contain"
                    />
                  )}
                </Circle>
              )
            })}
          </div>
        </div>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          startYOffset={-8}
          endYOffset={-8}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          startYOffset={-8}
          endYOffset={-8}
          delay={1.5}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          startYOffset={-8}
          endYOffset={-8}
          delay={3}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          reverse
          delay={2.5}
          startYOffset={8}
          endYOffset={8}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          reverse
          delay={4}
          startYOffset={8}
          endYOffset={8}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={userRef}
          toRef={mcpayRef}
          reverse
          delay={5.5}
          startYOffset={8}
          endYOffset={8}
          gradientStartColor="#34d399"
          gradientStopColor="#047857"
        />

        {AI_CLIENTS_CONFIG.map((client, index) => (
          <React.Fragment key={client.name}>
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={clientRefs[index]}
              toRef={mcpayRef}
              delay={clientDelays[index].forward}
              gradientStartColor="#34d399"
              gradientStopColor="#047857"
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={clientRefs[index]}
              toRef={mcpayRef}
              reverse
              delay={clientDelays[index].reverse}
              gradientStartColor="#34d399"
              gradientStopColor="#047857"
            />
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
        <p className="font-inter font-medium leading-relaxed text-lg text-left lg:max-w-[50%]">
          <span className="text-foreground">Register your API/MCP and any AI client can consume it.</span>{" "}
          <span className="text-muted-foreground">We handle x402 payments and authentication: you just get paid.</span>
        </p>
        <div className="flex flex-col lg:flex-row gap-4 lg:max-w-[50%] lg:flex-1">
          <Link href="/register" className="w-full lg:w-auto lg:flex-1">
            <Button variant="customTallAccent" size="tall" className="w-full lg:min-w-[200px]">
              Register (No Code)
            </Button>
          </Link>
          <Link href="https://docs.mcpay.tech/" target="_blank" rel="noopener noreferrer" className="w-full lg:w-auto lg:flex-1">
            <Button variant="customTallSecondary" size="tall" className="w-full lg:min-w-[200px]">
              SDK (code)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

