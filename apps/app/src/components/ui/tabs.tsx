"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tabsListVariants = cva(
  "bg-card text-muted-foreground inline-flex items-center justify-center rounded-[2px] font-mono gap-2",
  {
    variants: {
      size: {
        default: "h-9 p-[3px]",
        tall: "h-14 p-2",
      },
      variant: {
        default: "w-fit",
        equal: "w-full",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const tabsTriggerVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-transparent px-2 py-1 text-sm font-medium font-mono whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 hover:text-foreground hover:bg-muted cursor-pointer data-[state=active]:cursor-default [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: "h-[calc(100%-1px)]",
        tall: "h-[calc(100%-1px)]",
      },
      variant: {
        default: "flex-1 data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 data-[state=active]:text-foreground",
        highlight: "flex-1 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:text-background",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ size, variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & VariantProps<typeof tabsTriggerVariants>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ size, variant }), className)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
