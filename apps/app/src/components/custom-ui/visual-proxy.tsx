"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface AppIcon {
  name: string
  icon: string // Path to SVG
  color: string // Background color for the div
  iconWidth?: number // Icon width in pixels
  iconHeight?: number // Icon height in pixels
}

interface VisualProxyProps extends React.HTMLAttributes<HTMLDivElement> {
  apps?: AppIcon[]
}

// Default apps data - using MCPay icon as placeholder for all
const DEFAULT_APPS: AppIcon[] = Array.from({ length: 20 }, (_, i) => ({
  name: `App ${i + 1}`,
  icon: "/MCPay-icon.svg",
  color: `hsl(${(i * 18) % 360}, 70%, 50%)`, // Different colors for each
  iconWidth: 40,
  iconHeight: 40,
}))

export default function VisualProxy({
  apps = DEFAULT_APPS,
  className,
  ...props
}: VisualProxyProps) {
  // Duplicate apps for seamless infinite scroll
  const duplicatedApps = [...apps, ...apps]

  return (
    <div
      className={cn(
        "relative rounded-lg bg-card p-6 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Overlay with MCPay icon */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="relative flex items-center justify-center" style={{ width: "120px", height: "120px" }}>
          <div
            className={cn(
              "absolute inset-0 rounded-lg",
              "bg-foreground/80 backdrop-blur-md"
            )}
          />
          <div 
            className="relative z-10"
            style={{
              width: "60px",
              height: "60px",
              maskImage: "url(/MCPay-icon.svg)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskImage: "url(/MCPay-icon.svg)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              backgroundColor: "var(--background)",
            }}
          />
        </div>
      </div>

      {/* Scrolling carousel */}
      <div
        className="relative overflow-hidden flex items-center group"
        style={{ height: "120px" }}
      >
        {/* Left gradient overlay */}
        <div
          className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none bg-card w-20 md:w-40"
          style={{
            maskImage: "linear-gradient(to right, black, transparent)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent)",
          }}
        />
        
        {/* Right gradient overlay */}
        <div
          className="absolute right-0 top-0 bottom-0 z-20 pointer-events-none bg-card w-20 md:w-40"
          style={{
            maskImage: "linear-gradient(to left, black, transparent)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent)",
          }}
        />

        <div
          className="flex items-center gap-4 animate-scroll-carousel group-hover:[animation-play-state:paused]"
          style={{
            width: "max-content",
          }}
        >
          {duplicatedApps.map((app, index) => (
            <TooltipProvider key={`${app.name}-${index}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center justify-center rounded-lg shrink-0 transition-transform hover:scale-105"
                    style={{
                      width: "80px",
                      height: "80px",
                      backgroundColor: app.color,
                    }}
                  >
                    <Image
                      src={app.icon}
                      alt={app.name}
                      width={app.iconWidth || 40}
                      height={app.iconHeight || 40}
                      className="object-contain"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{app.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  )
}

