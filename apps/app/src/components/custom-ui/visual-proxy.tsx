"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface AppIcon {
  name: string
  icon: string
  color: string
  iconWidth?: number
  iconHeight?: number
  logoColor?: "white" | "default"
}

interface VisualProxyProps extends React.HTMLAttributes<HTMLDivElement> {
  apps?: AppIcon[]
}

const DEFAULT_APPS: AppIcon[] = [
  {
    name: "OpenAI",
    icon: "/logos/mcp-clients/OpenAI-black-monoblossom.svg",
    color: "#FFFFFF",
    iconWidth: 60,
    iconHeight: 60,
  },
  {
    name: "Claude",
    icon: "/logos/mcp-clients/claude.svg",
    color: "#D97757",
    iconWidth: 45,
    iconHeight: 45,
  },
  {
    name: "Google Gemini",
    icon: "/logos/mcp-clients/Google_Gemini_icon_2025.svg",
    color: "#FFFFFF",
    iconWidth: 50,
    iconHeight: 50,
  },
  {
    name: "Cursor",
    icon: "/logos/mcp-clients/cursor-cube.svg",
    color: "#F6F6F2",
    iconWidth: 45,
    iconHeight: 45,
  },
  {
    name: "Hugging Face",
    icon: "/logos/mcp-clients/hf-logo.svg",
    color: "#FFD21E",
    iconWidth: 50,
    iconHeight: 50,
  },
  {
    name: "Zed",
    icon: "/logos/mcp-clients/zed-logo.svg",
    color: "#000000",
    iconWidth: 45,
    iconHeight: 45,
    logoColor: "white",
  },
  {
    name: "DeepSeek",
    icon: "/logos/mcp-clients/DeepSeek-icon.svg",
    color: "#4D6BFE",
    iconWidth: 55,
    iconHeight: 55,
    logoColor: "white",
  },
  {
    name: "Ollama",
    icon: "/logos/mcp-clients/ollama.svg",
    color: "#FFFFFF",
    iconWidth: 45,
    iconHeight: 45,
  },
  {
    name: "Perplexity",
    icon: "/logos/mcp-clients/perplexity.svg",
    color: "#13343B",
    iconWidth: 40,
    iconHeight: 40,
  },
  {
    name: "Qwen",
    icon: "/logos/mcp-clients/qwen.svg",
    color: "#6060E5",
    iconWidth: 45,
    iconHeight: 45,
    logoColor: "white",
  },
  {
    name: "Replicate",
    icon: "/logos/mcp-clients/replicate.svg",
    color: "#D83D23",
    iconWidth: 45,
    iconHeight: 45,
    logoColor: "white",
  },
  {
    name: "Grok",
    icon: "/logos/mcp-clients/Grok_Logomark_Light.svg",
    color: "#000000",
    iconWidth: 45,
    iconHeight: 45,
  },
  {
    name: "Mistral",
    icon: "/logos/mcp-clients/m-rainbow.png",
    color: "#0F0F0F",
    iconWidth: 50,
    iconHeight: 50,
  },
]

export default function VisualProxy({
  apps = DEFAULT_APPS,
  className,
  ...props
}: VisualProxyProps) {
  const duplicatedApps = [...apps, ...apps]

  return (
    <div
      className={cn(
        "relative rounded-lg bg-card p-6 overflow-hidden",
        className
      )}
      {...props}
    >
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

      <div
        className="relative overflow-hidden flex items-center group"
        style={{ height: "120px" }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none bg-card w-20 md:w-40"
          style={{
            maskImage: "linear-gradient(to right, black, transparent)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent)",
          }}
        />
        
        <div
          className="absolute right-0 top-0 bottom-0 z-20 pointer-events-none bg-card w-20 md:w-40"
          style={{
            maskImage: "linear-gradient(to left, black, transparent)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent)",
          }}
        />

        <div
          className="flex items-center gap-8 animate-scroll-carousel group-hover:[animation-play-state:paused]"
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
                    {app.logoColor === "white" ? (
                      <div
                        style={{
                          width: app.iconWidth || 40,
                          height: app.iconHeight || 40,
                          maskImage: `url(${app.icon})`,
                          maskSize: "contain",
                          maskRepeat: "no-repeat",
                          maskPosition: "center",
                          WebkitMaskImage: `url(${app.icon})`,
                          WebkitMaskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          backgroundColor: "white",
                        }}
                      />
                    ) : (
                      <Image
                        src={app.icon}
                        alt={app.name}
                        width={app.iconWidth || 40}
                        height={app.iconHeight || 40}
                        className="object-contain"
                      />
                    )}
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

