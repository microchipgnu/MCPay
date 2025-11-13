import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-[2px] border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "h-9",
        mono: "h-9 font-mono",
        tall: "h-14 text-base",
        monetary: "h-9 font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Input({ 
  className, 
  type, 
  variant,
  onChange,
  ...props 
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  const isMonetary = variant === "monetary"
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMonetary && onChange) {
      // Only allow numbers and decimal point
      const inputValue = e.target.value.replace(/[^0-9.]/g, "")
      // Ensure only one decimal point
      const parts = inputValue.split(".")
      const filteredValue = parts.length > 2 
        ? parts[0] + "." + parts.slice(1).join("")
        : inputValue
      
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: filteredValue },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    } else if (onChange) {
      onChange(e)
    }
  }

  return (
    <div className={cn("relative", isMonetary && "flex items-center")}>
      {isMonetary && (
        <span className="absolute left-3 text-muted-foreground font-mono z-10">$</span>
      )}
      <input
        type={isMonetary ? "text" : type}
        data-slot="input"
        onChange={handleChange}
        className={cn(
          inputVariants({ variant }),
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          isMonetary && "pl-8 text-right",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input, inputVariants }
