"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TokenIcon } from "@/components/custom-ui/token-icon"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { mcpDataApi } from "@/lib/client/utils"
import { isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import { ArrowUpRight, CheckCircle2, Clock, Pause, Play, RefreshCcw } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type RecentPayment = {
  id: string
  createdAt: string
  status: "completed" | "failed"
  network?: string
  transactionHash?: string
  amountFormatted?: string
  currency?: string
  vlayerProof?: {
    success: boolean
    version?: string
    notaryUrl?: string
    valid: boolean
    generatedAt?: string
  }
}

type RecentPaymentsCardProps = {
  serverId: string
  initialPayments?: RecentPayment[]
  className?: string
  renderHeader?: (lastRefreshTime: Date | null, autoRefreshEnabled: boolean, paymentsCount: number, onToggleAutoRefresh: () => void, onRefresh: () => Promise<void>) => React.ReactNode
}

const ITEMS_PER_PAGE = 10

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

export function RecentPaymentsCard({ serverId, initialPayments, className, renderHeader }: RecentPaymentsCardProps) {
  const { isDark } = useTheme()
  const [payments, setPayments] = useState<RecentPayment[]>(initialPayments || [])
  const [loading, setLoading] = useState<boolean>(!initialPayments || initialPayments.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [selectedProof, setSelectedProof] = useState<RecentPayment['vlayerProof'] | null>(null)
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    console.log('selectedProof changed:', selectedProof)
  }, [selectedProof])

  const hasVisibleSkeleton = loading && payments.length === 0

  const totalPages = Math.max(1, Math.ceil(payments.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPayments = payments.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goPrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Reset to page 1 when payments change
  useEffect(() => {
    setCurrentPage(1)
  }, [payments.length])

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

  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled)
  }

  const handleRefresh = async () => {
    try {
      await fetchPayments()
      toast.success("Data refreshed")
    } catch (e) {
      toast.error("Failed to refresh data")
    }
  }

  return (
    <>
      {renderHeader && renderHeader(lastRefreshTime, autoRefreshEnabled, payments.length, handleToggleAutoRefresh, handleRefresh)}
      <div className={`bg-card rounded-[2px] p-4 ${className || ""}`}>
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
                {paginatedPayments.length > 0 && (
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
                  {paginatedPayments.map((p) => {
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
                          <div className="flex items-center justify-end gap-2">
                            {p.vlayerProof && (
                              <Button
                                type="button"
                                variant="accentBlue"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  console.log('Web Proof button clicked', p.vlayerProof)
                                  setSelectedProof(p.vlayerProof || null)
                                  setIsProofModalOpen(true)
                                }}
                                className="h-auto px-3 py-2 text-xs font-medium flex items-center gap-2 rounded-[2px]"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 110 95"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="opacity-90"
                                  aria-label="VLayer Proof"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M0 1.90735e-05L55 95L85.0069 43.1699L76.3049 38.1597L65.2209 57.3047L37.8248 9.98415L92.6171 9.98414L81.3187 29.4994L90.0207 34.5097L110 0L0 1.90735e-05Z"
                                    fill="currentColor"
                                  />
                                </svg>
                                <span className="font-semibold uppercase">WEB PROOF</span>
                              </Button>
                            )}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {paginatedPayments.length === 0 && !loading && (
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
      
      {payments.length > ITEMS_PER_PAGE && (
        <div className="pt-4 border-t border-border">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={goPrev}
                  aria-disabled={currentPage === 1 || loading}
                  className={cn(
                    currentPage === 1 || loading ? "pointer-events-none opacity-50" : "cursor-pointer",
                    "[&_span]:uppercase"
                  )}
                />
              </PaginationItem>

              {totalPages > 1 && (
                <>
                  {currentPage > 2 && (
                    <>
                      <PaginationItem>
                        <PaginationLink onClick={() => goToPage(1)} className="cursor-pointer">1</PaginationLink>
                      </PaginationItem>
                      {currentPage > 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}

                  {Array.from({ length: 3 })
                    .map((_, i) => currentPage - 1 + i)
                    .filter(p => p >= 1 && p <= totalPages)
                    .map(p => (
                      <PaginationItem key={p}>
                        <PaginationLink 
                          onClick={() => goToPage(p)} 
                          isActive={p === currentPage}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink onClick={() => goToPage(totalPages)} className="cursor-pointer">
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={goNext}
                  aria-disabled={currentPage === totalPages || loading}
                  className={cn(
                    currentPage === totalPages || loading ? "pointer-events-none opacity-50" : "cursor-pointer",
                    "[&_span]:uppercase"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
        <DialogContent className={`max-w-2xl ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className={`${isDark ? "text-white" : "text-gray-900"}`}>
              Web Proof Details
            </DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
              zkTLS proof - Cryptographic proof information for this payment
            </DialogDescription>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4 mt-4">
              <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedProof.valid && selectedProof.success
                        ? isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"
                        : isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"
                    }`}>
                      {selectedProof.valid && selectedProof.success ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  
                  {selectedProof.version && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Version</span>
                      <span className={`text-sm font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {selectedProof.version}
                      </span>
                    </div>
                  )}
                  
                  {selectedProof.generatedAt && (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Generated At</span>
                      <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {formatDate(selectedProof.generatedAt)}
                      </span>
                    </div>
                  )}
                  
                  {selectedProof.notaryUrl && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Notary URL</span>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7"
                      >
                        <a href={selectedProof.notaryUrl} target="_blank" rel="noreferrer">
                          View Notary
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className={`mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <a 
              href="https://vlayer.xyz" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-xs">Powered By</span>
              <Image
                src="/vlayer-logo.svg"
                alt="VLayer"
                width={64}
                height={64}
                className="opacity-80"
              />
            </a>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
