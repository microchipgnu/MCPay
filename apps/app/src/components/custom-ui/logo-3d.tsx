import * as React from "react"
import { cn } from "@/lib/utils"

interface Logo3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export default function Logo3D({
  children,
  className,
  ...props
}: Logo3DProps) {
  const hasFullHeight = className && className.includes("h-full")
  
  return (
    <div
      className={cn(
        "w-full rounded-lg bg-card",
        !hasFullHeight && "min-h-[400px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

