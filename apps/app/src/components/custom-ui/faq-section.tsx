"use client"

import React from "react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

interface FAQItem {
  question: string
  answer: string | React.ReactNode
}

const faqData: FAQItem[] = [
  {
    question: "What is MCPay?",
    answer: (
      <>
        MCPay is a <strong>payment layer for MCP servers and plain HTTP APIs</strong>. It uses <code>HTTP 402 Payment Required</code> with the <strong>x402</strong> flow so clients (apps/agents/browsers) can pay per call and automatically retry to get the result. <strong>No subscriptions, no OAuth, no manual API keys.</strong>
      </>
    )
  },
  {
    question: "Do I have to use MCP?",
    answer: (
      <>
        No. MCPay works great for <strong>plain HTTP</strong> endpoints. Using MCP adds niceties like <strong>tool discovery and pricing metadata</strong> for agent ecosystems.
      </>
    )
  },
  {
    question: "Who is MCPay for?",
    answer: (
      <div className="space-y-2">
        <div><strong>Providers</strong> (API/MCP owners) who want to <strong>price and monetize</strong> specific tools or routes.</div>
        <div><strong>Integrators/Agents</strong> who need <strong>programmatic, per-call payments</strong> without human sign-ups.</div>
        <div><strong>Builders</strong> who want the <strong>fastest path</strong> to ship paid MCP servers.</div>
      </div>
    )
  },
  {
    question: "What's the MCPay Registry?",
    answer: (
      <>
        A machine-readable catalog of MCP servers and their priced tools (analytics, recent payments, integration snippets). Browse the Registry at <Link href="/servers" className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold">Servers</Link>.
      </>
    )
  }
]

export default function FAQSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left side - Title */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-host text-foreground leading-tight">
            Frequently Asked<br />
            Questions
          </h2>
        </div>

        {/* Right side - FAQ Items */}
        <div>
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className={cn(
                  "border border-transparent rounded-[2px] bg-card mb-4 last:mb-0",
                  "hover:shadow-lg hover:border-teal-700 dark:hover:border-teal-200",
                  "transition-all duration-300 cursor-pointer"
                )}
              >
                <AccordionTrigger className={cn(
                  "text-left hover:no-underline group cursor-pointer px-4",
                  "data-[state=closed]:py-3 data-[state=open]:py-4"
                )}>
                  <span className="text-sm sm:text-[15px] leading-relaxed font-mono uppercase text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-200 transition-all duration-300">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm sm:text-[15px] leading-relaxed text-foreground px-4 pb-4">
                    {item.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
