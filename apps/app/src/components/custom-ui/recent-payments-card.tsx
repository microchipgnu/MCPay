"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
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
import { ArrowUpRight, CheckCircle2 } from "lucide-react"
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
        const res = await mcpDataApi.getServerById(serverId)
        const next = (res as { recentPayments?: RecentPayment[] }).recentPayments || []
        setPayments(next)
        setLastRefreshTime(new Date())
      } catch {
        // Error handled silently - component will show empty state
      } finally {
        setLoading(false)
      }
    }
  }, [serverId, payments.length])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    if (!autoRefreshEnabled || !serverId) return
    const interval = setInterval(async () => {
      try {
        await fetchPayments()
      } catch {
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
    } catch {
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
        <DialogContent className="max-w-2xl rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Web Proof Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              zkTLS proof - Cryptographic proof information for this payment
            </DialogDescription>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground uppercase">Status</span>
                <span className={`px-2 py-1 rounded-[2px] text-xs font-medium ${
                  selectedProof.valid && selectedProof.success
                    ? "text-teal-700 bg-teal-500/10 dark:text-teal-200 dark:bg-teal-800/50"
                    : "bg-red-900/30 text-red-400 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {selectedProof.valid && selectedProof.success ? "Valid" : "Invalid"}
                </span>
              </div>
              
              {selectedProof.version && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground uppercase">Version</span>
                  <span className="text-sm font-mono text-foreground uppercase">
                    {selectedProof.version}
                  </span>
                </div>
              )}
              
              {selectedProof.generatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground uppercase">Generated At</span>
                  <span className="text-sm font-mono text-foreground">
                    {formatDate(selectedProof.generatedAt)}
                  </span>
                </div>
              )}
              
              {selectedProof.notaryUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground uppercase">Notary URL</span>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="h-auto px-3 py-2 text-xs font-medium uppercase rounded-[2px]"
                  >
                    <a href={selectedProof.notaryUrl} target="_blank" rel="noreferrer">
                      View Notary
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 border-t border-border flex items-center justify-center gap-2 text-muted-foreground pt-4">
            <a 
              href="https://vlayer.xyz" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity mt-4"
            >
              <span className="text-xs">Powered By</span>
              <svg width="56" height="12" viewBox="0 0 72 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white">
                <g clipPath="url(#clip0_2364_5115)">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0 0.40625L9.16668 16.3032L14.1678 7.63013L12.7175 6.79176L10.8702 9.9954L6.30414 2.07697H15.4362L13.5531 5.34258L15.0034 6.18096L18.3333 0.40625H0Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M32.6708 2.24696V12.9565H35.0015V0.40625H32.6708H31.6678V2.24696H32.6708ZM43.1892 12.9579V11.0389C43.1145 11.2744 43.02 11.4898 42.9048 11.685C42.3426 12.6835 41.34 12.9579 40.2513 12.9579C39.5935 12.9579 39.0029 12.8563 38.5012 12.6218C38.0109 12.3873 37.6486 12.1037 37.3698 11.6682C37.1025 11.2327 36.9684 10.7079 36.9684 10.0937C36.9684 9.42365 37.1302 8.87647 37.4534 8.45212C37.788 8.02778 38.2505 7.70953 38.8415 7.49733C39.4434 7.28518 40.1457 7.17908 40.9485 7.17908H42.8045V7.09534C42.8045 6.57046 42.6765 6.34696 42.4198 6.09011C42.1634 5.83326 41.7677 5.70485 41.2326 5.70485C40.9538 5.70485 40.6196 5.71042 40.2292 5.72159C39.8392 5.73276 39.4434 5.74951 39.042 5.77185C38.652 5.78303 38.3007 5.79977 37.9885 5.82212V3.84554C38.2449 3.82319 38.535 3.80088 38.8582 3.77853C39.4029 3.7409 39.948 3.74262 40.4934 3.74433C40.6072 3.74469 40.7209 3.74505 40.8347 3.74505C41.7713 3.74505 42.5257 3.85111 43.1391 4.09678C43.7634 4.34246 44.2317 4.72775 44.5435 5.25259C44.8671 5.77742 45.0285 6.46423 45.0285 7.31292V12.9579H43.1892ZM42.8045 8.56936V9.42365C42.7821 9.91501 42.6765 10.3059 42.487 10.5962C42.3085 10.8754 42.0799 11.0764 41.8011 11.1992C41.5337 11.3109 41.2383 11.3667 40.9151 11.3667C40.38 11.3667 39.9675 11.2383 39.6774 10.9815C39.399 10.7246 39.2596 10.3896 39.2596 9.97641C39.2596 9.56323 39.399 9.22824 39.6774 8.97139C39.9675 8.70337 40.38 8.56936 40.9151 8.56936H42.8045ZM58.5681 4.13355C59.1049 3.87941 59.7247 3.75297 60.4262 3.75297C61.3471 3.75297 62.1197 3.95838 62.7416 4.37187C63.372 4.77362 63.8449 5.30792 64.1602 5.97426C64.4749 6.62894 64.6324 7.3363 64.6324 8.09571V8.92206H58.2701C58.3085 9.22985 58.3796 9.51426 58.4834 9.77553C58.6466 10.1765 58.8966 10.4943 59.2326 10.7301C59.5672 10.9545 59.9953 11.0683 60.5197 11.0683C61.0449 11.0683 61.468 10.9647 61.7922 10.7609C62.1183 10.5453 62.3241 10.2858 62.4145 9.98326L62.4233 9.9537H64.5016L64.4909 10.0038C64.365 10.5958 64.1233 11.1147 63.7652 11.5596C63.4072 12.0047 62.9492 12.3487 62.3924 12.5919C61.8456 12.8353 61.2212 12.9564 60.5197 12.9564C59.7869 12.9564 59.1416 12.8301 58.5841 12.576L58.5837 12.5759C58.0379 12.3224 57.581 11.9842 57.2127 11.5608L57.212 11.56C56.8553 11.1273 56.5826 10.6469 56.3938 10.1191V10.1184C56.2153 9.59086 56.1265 9.05264 56.1265 8.50385V8.20559C56.1265 7.63602 56.2153 7.0873 56.3938 6.55968V6.55922C56.5826 6.02078 56.8557 5.54524 57.2127 5.13296C57.5807 4.70972 58.0329 4.37655 58.5681 4.13355ZM60.4262 5.64116C59.954 5.64116 59.5569 5.74951 59.2322 5.96398C58.9069 6.17864 58.6573 6.49086 58.4831 6.90289C58.4084 7.08595 58.3508 7.28654 58.3099 7.5048H62.4721C62.4337 7.25498 62.3732 7.02812 62.2907 6.82399C62.1378 6.44398 61.9039 6.15276 61.5892 5.94849L61.5885 5.94813C61.2852 5.74447 60.8984 5.64116 60.4262 5.64116ZM66.493 3.75297V12.9564H68.8376V8.18949C68.8376 7.39863 69.0509 6.79711 69.4783 6.38497C69.9167 5.96166 70.5297 5.75004 71.3165 5.75004H72.0013V3.75297H71.6201C70.5297 3.75297 69.7033 4.06244 69.1409 4.73078C68.7167 5.23545 68.4521 5.92104 68.3483 6.78765V3.75297H66.493ZM46.9997 14.2952V16.3032H48.5012C49.2525 16.3032 49.8765 16.1968 50.381 16.0171C50.8969 15.8374 51.3176 15.5397 51.6425 15.124C51.9679 14.7196 52.2203 14.1748 52.3995 13.4895L55.1679 3.75297H52.9179L51.0274 10.9596H50.6737L48.418 3.75297H46.0845L49.0847 12.9565H50.5012C50.4237 13.2809 50.2953 13.4745 50.0781 13.7423C49.7634 14.1545 49.2113 14.2952 48.7156 14.2952H46.9997ZM21.668 3.75297L24.5548 12.9564H28.3346L30.8347 3.75297H28.5846L26.6749 11.0175H26.2746L24.0411 3.75297H21.668Z" fill="currentColor"/>
                </g>
                <defs>
                  <clipPath id="clip0_2364_5115">
                    <rect width="72" height="16" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </a>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
