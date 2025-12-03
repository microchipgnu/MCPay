import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const highlighterTextVariants = cva(
  "inline-flex items-center font-mono text-xs uppercase font-medium tracking-wide px-2 py-1 rounded-[2px]",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        blue: "text-blue-700 bg-blue-500/10 dark:text-blue-200 dark:bg-blue-800/50",
        amber: "text-amber-700 bg-amber-500/10 dark:text-amber-200 dark:bg-amber-800/50",
        red: "text-red-700 bg-red-500/10 dark:text-red-200 dark:bg-red-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const highlighterIconVariants = cva(
  "flex items-center justify-center font-mono text-xs uppercase font-medium tracking-wide size-6 rounded-[2px]",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        blue: "text-blue-700 bg-blue-500/10 dark:text-blue-200 dark:bg-blue-800/50",
        amber: "text-amber-700 bg-amber-500/10 dark:text-amber-200 dark:bg-amber-800/50",
        red: "text-red-700 bg-red-500/10 dark:text-red-200 dark:bg-red-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface HighlighterTextProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof highlighterTextVariants> {
  children: React.ReactNode
  icon?: LucideIcon
}

export default function HighlighterText({
  children,
  className,
  icon: Icon,
  variant,
  ...props
}: HighlighterTextProps) {
  if (Icon) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <div className={cn(highlighterIconVariants({ variant }))}>
          <Icon className="size-4" />
        </div>
        <div
          className={cn(highlighterTextVariants({ variant }), className)}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(highlighterTextVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

