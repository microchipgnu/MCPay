"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TokenIcon } from "@/components/custom-ui/token-icon"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { mcpDataApi } from "@/lib/client/utils"
import { isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import { ArrowUpRight, CheckCircle2, Clock, Pause, Play, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

export type RecentPayment = {
  id: string
  createdAt: string
  status: "completed" | "failed"
  network?: string
  transactionHash?: string
  amountFormatted?: string
  currency?: string
}

type RecentPaymentsCardProps = {
  serverId: string
  initialPayments?: RecentPayment[]
  className?: string
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  return new Date(dateString).toLocaleString()
}

function formatRelativeShort(iso?: string, now = Date.now()) {
  if (!iso) return ""
  const diffMs = new Date(iso).getTime() - now
  const abs = Math.abs(diffMs)
  const sec = Math.round(abs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const month = Math.round(day / 30)
  const year = Math.round(day / 365)

  const value =
    sec < 60 ? { n: Math.max(1, sec), u: "secs" } :
      min < 60 ? { n: min, u: "mins" } :
        hr < 24 ? { n: hr, u: "hrs" } :
          day < 30 ? { n: day, u: "days" } :
            month < 12 ? { n: month, u: "mos" } :
              { n: year, u: "yrs" }

  return `${value.n} ${value.u} ${diffMs <= 0 ? "ago" : "from now"}`
}

function safeTxUrl(network?: string, hash?: string) {
  if (!network || !hash) return undefined
  if (isNetworkSupported(network)) {
    return getExplorerUrl(hash, network as UnifiedNetwork, "tx")
  }
  return `https://etherscan.io/tx/${hash}`
}

export function RecentPaymentsCard({ serverId, initialPayments, className }: RecentPaymentsCardProps) {
  const { isDark } = useTheme()
  const [payments, setPayments] = useState<RecentPayment[]>(initialPayments || [])
  const [loading, setLoading] = useState<boolean>(!initialPayments || initialPayments.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  const hasVisibleSkeleton = loading && payments.length === 0

  const fetchPayments = useMemo(() => {
    return async () => {
      try {
        if (payments.length === 0) setLoading(true)
        setError(null)
        const res = await mcpDataApi.getServerById(serverId)
        const next = (res as { recentPayments?: RecentPayment[] }).recentPayments || []
        setPayments(next)
        setLastRefreshTime(new Date())
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments")
      } finally {
        setLoading(false)
      }
    }
  }, [serverId, payments.length])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await fetchPayments()
    })()
    return () => { alive = false }
  }, [fetchPayments])

  useEffect(() => {
    if (!autoRefreshEnabled || !serverId) return
    const interval = setInterval(async () => {
      try {
        await fetchPayments()
      } catch (e) {
        // ignore periodic errors
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefreshEnabled, serverId, fetchPayments])

  return (
    <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} mt-6 overflow-hidden ${className || ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-500"></div>
              Recent Payments
              {payments.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full">
                  {payments.length}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Latest payment transactions from tool usage with verified token information
            </CardDescription>
            {(lastRefreshTime || autoRefreshEnabled) && (
              <div className="flex items-center gap-3 mt-2">
                {lastRefreshTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last updated {formatRelativeShort(lastRefreshTime.toISOString())}</span>
                  </div>
                )}
                {autoRefreshEnabled && (
                  <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></div>
                    <span>Auto-refresh every 10s</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                    className={`h-6 w-6 p-0 ${
                      autoRefreshEnabled 
                        ? "text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    } transition-all duration-300`}
                  >
                    {autoRefreshEnabled ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefreshEnabled 
                    ? "Pause auto-refresh (every 10s)" 
                    : "Enable auto-refresh every 10 seconds"
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await fetchPayments()
                        toast.success("Data refreshed")
                      } catch (e) {
                        toast.error("Failed to refresh data")
                      }
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hasVisibleSkeleton ? (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-0">
                    <TableHead className="w-[50px] pl-6 pr-2">Status</TableHead>
                    <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Date</TableHead>
                    <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Amount</TableHead>
                    <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Network</TableHead>
                    <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-right whitespace-nowrap bg-muted/30 pr-6">Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-muted/30 transition-all duration-200">
                      <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                        <div className="space-y-2">
                          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                          <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full bg-muted animate-pulse"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                            <div className="h-3 w-8 bg-muted animate-pulse rounded"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-muted animate-pulse"></div>
                          <div className="h-6 w-16 bg-muted animate-pulse rounded-full"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
                          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <Table>
                {payments.length > 0 && (
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="w-[40px] pr-1 sr-only">Status</TableHead>
                      <TableHead className="px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap font-mono">Method</TableHead>
                      <TableHead className="px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap font-mono">Amount</TableHead>
                      <TableHead className="px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap font-mono">Network</TableHead>
                      <TableHead className="px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap font-mono">Date</TableHead>
                      <TableHead className="px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap font-mono text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {payments.map((p) => {
                    const txUrl = safeTxUrl(p.network, p.transactionHash)
                    const fullDate = formatDate(p.createdAt)
                    const rel = formatRelativeShort(p.createdAt)
                    const td = "px-1 sm:px-2 py-3.5 border-t border-border align-middle"
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className={`${td} w-[40px] pr-1`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300"
                                  aria-label={p.status}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{p.status === 'completed' ? 'Success' : p.status === 'failed' ? 'Failed' : 'Pending'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className={td}>
                          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">tool_call</span>
                        </TableCell>
                        <TableCell className={`${td} font-mono`}>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            {p.currency && <TokenIcon currencyOrAddress={p.currency} network={p.network} size={16} />}
                            <span className="text-foreground">{p.amountFormatted || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`${td} font-mono text-xs sm:text-sm text-muted-foreground`}>
                          <span className="font-mono text-sm border border-foreground-muted px-2 py-0.5 rounded text-foreground-muted">
                            {p.network || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell className={`${td} text-[0.95rem] sm:text-sm text-muted-foreground pr-1`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-default">{rel}</TooltipTrigger>
                              <TooltipContent>{fullDate}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className={`${td} text-right`}>
                          {p.transactionHash ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild size="icon" variant="ghost" className="group h-7 w-7 rounded-sm">
                                    <a href={txUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <ArrowUpRight className="size-5 stroke-[2] text-muted-foreground/80 group-hover:text-foreground transition-all duration-300" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Transaction</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {payments.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="px-6 py-12 text-center">
                        <div className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <p className="text-sm">No recent payments</p>
                          <p className="text-xs mt-1">Payments will appear here once tools are used with monetization enabled</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


