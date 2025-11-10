"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface GithubInfoProps extends React.HTMLAttributes<HTMLElement> {
  className?: string
}

export default function GithubInfo({
  className,
  ...props
}: GithubInfoProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24",
        className
      )}
      {...props}
    >
      <div className="rounded-lg bg-card p-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start lg:items-center">
          {/* Left Column - Content */}
          <div className="flex-1 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight max-w-3xl">
                The most complete SDK.{" "}
                <span className="font-normal text-muted-foreground">Leave a star if you scrolled all this way.</span>
              </h2>
            </div>

            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-teal-500/10 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} />
                </div>
                <span className="font-host text-foreground text-lg">Support for EVM and Solana</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-teal-500/10 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} />
                </div>
                <span className="font-host text-foreground text-lg">Extendable with plugins</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-teal-500/10 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} />
                </div>
                <span className="font-host text-foreground text-lg">Simple X402 setup</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-teal-500/10 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} />
                </div>
                <span className="font-host text-foreground text-lg">Open source</span>
              </div>
            </div>

            <Link href="https://github.com/microchipgnu/MCPay" target="_blank" rel="noopener noreferrer" className="w-full lg:w-auto lg:max-w-[280px]">
              <Button variant="customTallPrimary" size="tall" className="w-full lg:min-w-[220px]">
                STAR ON GITHUB
              </Button>
            </Link>
          </div>

          {/* Right Column - Code Block */}
          <div className="flex-1 w-full">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-3 text-xs font-mono leading-5 overflow-x-auto">
                <div className="flex min-w-max">
                  <div className="select-none text-slate-400 pr-3 text-right min-w-[1.5rem] flex-shrink-0">
                    {Array.from({ length: 20 }, (_, i) => (
                      <div key={i + 1} className="h-5">{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-max">
                    <div className="h-5"><span className="text-slate-400">import</span> <span className="text-slate-400">&#123;</span> <span className="text-blue-400">createMcpPaidHandler</span> <span className="text-slate-400">&#125;</span> <span className="text-slate-400">from</span> <span className="text-teal-500">&quot;mcpay/handler&quot;</span></div>
                    <div className="h-5"></div>
                    <div className="h-5"><span className="text-slate-400">export</span> <span className="text-slate-400">const</span> <span className="text-blue-400">paidMcp</span> <span className="text-slate-400">=</span> <span className="text-blue-400">createMcpPaidHandler</span><span className="text-slate-400">(</span></div>
                    <div className="h-5 pl-4"><span className="text-slate-400">async</span> <span className="text-slate-400">(</span><span className="text-white">server</span><span className="text-slate-400">) =&gt;</span> <span className="text-slate-400">&#123;</span></div>
                    <div className="h-5"></div>
                    <div className="h-5 pl-8"><span className="text-white">server</span><span className="text-slate-400">.</span><span className="text-blue-400">paidTool</span><span className="text-slate-400">(</span></div>
                    <div className="h-5 pl-12"><span className="text-teal-500">&quot;hello&quot;</span><span className="text-slate-400">,</span></div>
                    <div className="h-5 pl-12"><span className="text-teal-500">&quot;pay for hello&quot;</span><span className="text-slate-400">,</span></div>
                    <div className="h-5 pl-12"><span className="text-orange-400">&quot;$0.001&quot;</span><span className="text-slate-400">,</span></div>
                    <div className="h-5 pl-12"><span className="text-slate-400">&#123;&#125;,</span></div>
                    <div className="h-5 pl-12"><span className="text-slate-400">async</span> <span className="text-slate-400">(&#123;&#125;) =&gt;</span> <span className="text-slate-400">(&#123;</span> <span className="text-slate-500">content</span><span className="text-slate-400">:</span> <span className="text-slate-400">[&#123;</span> <span className="text-slate-500">type</span><span className="text-slate-400">:</span> <span className="text-teal-500">&apos;text&apos;</span><span className="text-slate-400">,</span> <span className="text-slate-500">text</span><span className="text-slate-400">:</span> <span className="text-teal-500">`Hello, world!`</span> <span className="text-slate-400">&#125;]</span> <span className="text-slate-400">&#125;)</span></div>
                    <div className="h-5 pl-8"><span className="text-slate-400">)</span></div>
                    <div className="h-5"></div>
                    <div className="h-5"><span className="text-slate-400">&#125;, &#123;</span></div>
                    <div className="h-5 pl-4"><span className="text-slate-500">recipient</span><span className="text-slate-400">: &#123;</span></div>
                    <div className="h-5 pl-8"><span className="text-slate-500">evm</span><span className="text-slate-400">: &#123;</span></div>
                    <div className="h-5 pl-12"><span className="text-slate-500">address</span><span className="text-slate-400">:</span> <span className="text-orange-400">&apos;0x036CbD53842c5426634e7929541eC2318f3dCF7e&apos;</span></div>
                    <div className="h-5 pl-8"><span className="text-slate-400">&#125;</span></div>
                    <div className="h-5 pl-4"><span className="text-slate-400">&#125;</span></div>
                    <div className="h-5"><span className="text-slate-400">&#125;)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

