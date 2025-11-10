import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import { LucideIcon } from "lucide-react"

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  label: string
  copy: React.ReactNode
  ctaText?: string
  ctaHref?: string
}

export default function InfoCard({
  icon,
  label,
  copy,
  ctaText,
  ctaHref,
  className,
  ...props
}: InfoCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-8 p-6 rounded-lg bg-card",
        className
      )}
      {...props}
    >
      <div className="inline-flex">
        <HighlighterText icon={icon} className="!text-foreground">{label}</HighlighterText>
      </div>
      <p className="font-host text-foreground leading-relaxed text-lg">{copy}</p>
      {ctaText && ctaHref ? (
        <div className="mt-auto pt-12">
          <Link href={ctaHref}>
            <Button variant="customTallSecondary" size="tall" className="w-full">
              {ctaText}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-auto pt-12" />
      )}
    </div>
  )
}

