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
    question: "What is MCPay and who is it for?",
    answer: (
      <>
        MCPay is payment and access infrastructure for MCP servers. We offer solution for both ends:
        <div className="mt-3 space-y-2">
          <div><strong>A) People who want to use paid MCP tools:</strong> Sign up, find a server and start using paid tools across clients like ChatGPT. No crypto or technical setup required.</div>
          <div><strong>B) Developers who want to monetize MCP Servers or APIs:</strong> Use our open-source SDK or no-code UI to monetize your tools. Get access to a new range of developers and get ready for the agentic future.</div>
        </div>
      </>
    )
  },
  {
    question: "Why would I want to consume paid MCPs?",
    answer: (
      <>
        Instead of paying for expensive B2B/Enterprise subscriptions you can consume only the tools calls you want and pay cents per use.
      </>
    )
  },
  {
    question: "How do I consume paid MCPs?",
    answer: (
      <>
        Sign in, add funds to your account (no crypto needed), and <Link href="/servers" className="text-muted-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300">browse</Link> available MCP servers. You can run tools directly inside MCPay or connect them to clients like ChatGPT, where they&apos;ll execute automatically when needed.
      </>
    )
  },
  {
    question: "How much do I pay?",
    answer: (
      <>
        Each MCP tool sets its own price, typically a few cents (e.g., $0.05). We do not charge any fees on top of that.
      </>
    )
  },
  {
    question: "Why would I want to monetize MCPs?",
    answer: (
      <>
        If you manage an API that normally requires subscriptions or API keys, converting it to an MCP server gives you exposure to a growing new audience: individual developers, LLMs, agents, and MCP-compatible clients.
      </>
    )
  },
  {
    question: "How do I monetize my API or MCP Server?",
    answer: (
      <>
        Use our open-source SDK to add payments in a few lines of code.
        <br /><br />
        Or, if you prefer no-code, you can configure pricing directly through our UI.
      </>
    )
  },
  {
    question: "Does this project have a token?",
    answer: (
      <>
        There is no official $MCPAY token, be careful with impersonators. Trust only official announcement on <Link href="https://t.me/mcpay_tech" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300">Telegram</Link> or <Link href="https://x.com/mcpaytech" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300">X</Link>.
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
                  "hover:shadow-lg",
                  "transition-all duration-300 cursor-pointer"
                )}
              >
                <AccordionTrigger className={cn(
                  "text-left hover:no-underline group cursor-pointer px-4",
                  "data-[state=closed]:py-3 data-[state=open]:py-4"
                )}>
                  <span className="text-sm sm:text-[15px] leading-relaxed font-mono font-medium uppercase text-muted-foreground group-hover:text-foreground group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2 transition-all duration-300">
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
