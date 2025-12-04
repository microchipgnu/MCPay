import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-medium font-mono transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        ghostCustom:
          "text-teal-700 font-mono tracking-wider uppercase text-[13px] bg-teal-500/10 hover:bg-teal-500/20 rounded-[2px] dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300",
        ghostCustomSecondary:
          "text-foreground font-mono tracking-wider uppercase text-[13px] bg-muted-foreground/10 dark:bg-muted-foreground/20 dark:hover:bg-muted-foreground/30 hover:bg-muted-foreground/20 rounded-[2px] transition-all duration-300",
        customTallPrimary:
          "bg-foreground text-background font-mono tracking-wider uppercase text-sm rounded-[2px] hover:bg-foreground/90",
        customTallSecondary:
          "bg-muted text-foreground font-mono tracking-wider uppercase text-sm rounded-[2px] hover:bg-muted/90",
        customTallAccent:
          "text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 font-mono tracking-wider uppercase text-sm rounded-[2px] transition-all duration-300",
        customTallAccentAmber:
          "text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 dark:text-amber-200 dark:bg-amber-800/50 dark:hover:bg-amber-800/70 font-mono tracking-wider uppercase text-sm rounded-[2px] transition-all duration-300",
        accentBlue:
          "text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 dark:text-blue-200 dark:bg-blue-800/50 dark:hover:bg-blue-800/70 font-mono tracking-wider uppercase text-sm rounded-[2px] transition-all duration-300"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 text-xs rounded-sm px-2 gap-1 has-[>svg]:px-1.5",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        tall: "h-14 px-6 py-4 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  animated = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    animated?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  const buttonClasses = cn(
    buttonVariants({ variant, size }),
    animated && "relative overflow-hidden group",
    className
  )

  if (animated && !asChild) {
    return (
      <Comp
        data-slot="button"
        className={buttonClasses}
        {...props}
      >
        <span className="relative inline-flex items-center transition-transform duration-300 ease-out group-hover:-translate-x-1">
          {children}
          <ChevronRight className="absolute left-full ml-2 h-4 w-4 shrink-0 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0" />
        </span>
      </Comp>
    )
  }
  
  if (animated && asChild) {
    // When asChild is true, we can't add the icon, so just add the group class
    // The parent component should handle the animation
    return (
      <Comp
        data-slot="button"
        className={buttonClasses}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="button"
      className={buttonClasses}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
