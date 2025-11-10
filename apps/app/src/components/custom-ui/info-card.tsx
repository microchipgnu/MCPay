import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import HighlighterText from "./highlighter-text"
import { LucideIcon } from "lucide-react"

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  label: string
  copy: string
  ctaText: string
  ctaHref: string
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
        "flex flex-col gap-4 p-6 rounded-lg bg-card",
        className
      )}
      {...props}
    >
      <div className="inline-flex">
        <HighlighterText icon={icon}>{label}</HighlighterText>
      </div>
      <p className="font-host text-foreground leading-relaxed text-base">{copy}</p>
      <Link href={ctaHref} className="mt-auto">
        <Button variant="customTallSecondary" size="tall" className="w-full">
          {ctaText}
        </Button>
      </Link>
    </div>
  )
}

