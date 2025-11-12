"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, Eye, EyeOff, FlaskConical, Loader2, Trash2, Wallet as WalletIcon, Copy, Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import HighlighterText from "@/components/custom-ui/highlighter-text"
import { cn } from "@/lib/utils"
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types"
import { useUserWallets, usePrimaryWallet } from "@/components/providers/user"
import { getBlockchainArchitecture } from "@/lib/commons/networks"
import type { UserWallet } from "@/types/wallet"

export type MCPToolLite = { name: string; description?: string }

export type MonetizeWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverUrl: string
  tools: MCPToolLite[]
  initialAuthHeaders?: Array<{ key: string; value: string }>
  initialRequireAuth?: boolean
  onCreate: (payload: {
    prices: Record<string, number>
    evmRecipientAddress?: string
    svmRecipientAddress?: string
    networks: string[]
    requireAuth: boolean
    authHeaders: Record<string, string>
    testnet: boolean
  }) => Promise<void>
}

export function MonetizeWizard({ open, onOpenChange, serverUrl, tools, initialAuthHeaders, initialRequireAuth, onCreate }: MonetizeWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Wallet hooks
  const userWallets = useUserWallets()
  const primaryWallet = usePrimaryWallet()

  const [priceByTool, setPriceByTool] = useState<Record<string, number>>(() => Object.fromEntries((tools || []).map(t => [t.name, 0.01])))
  const [evmRecipientAddress, setEvmRecipientAddress] = useState<string>("")
  const [svmRecipientAddress, setSvmRecipientAddress] = useState<string>("")
  const [recipientIsTestnet, setRecipientIsTestnet] = useState(false)
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [requireAuth, setRequireAuth] = useState(initialRequireAuth || false)
  const [authHeaders, setAuthHeaders] = useState<Array<{ key: string; value: string }>>(
    initialAuthHeaders && initialAuthHeaders.length > 0 ? initialAuthHeaders : [{ key: "", value: "" }]
  )
  const [showValues, setShowValues] = useState(true)
  const [bulkHeadersText, setBulkHeadersText] = useState("")
  const [toolsSearch, setToolsSearch] = useState("")
  const [bulkPriceInput, setBulkPriceInput] = useState<string>("")
  const [priceInputDigits, setPriceInputDigits] = useState<Record<string, string>>({})

  useEffect(() => {
    const fn = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    fn();
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Update auth state when initial props change
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('MonetizeWizard: initialRequireAuth', initialRequireAuth)
      // eslint-disable-next-line no-console
      console.log('MonetizeWizard: initialAuthHeaders', initialAuthHeaders)
    }
    if (initialRequireAuth !== undefined) {
      setRequireAuth(initialRequireAuth)
    }
    if (initialAuthHeaders && initialAuthHeaders.length > 0) {
      setAuthHeaders(initialAuthHeaders)
    }
  }, [initialRequireAuth, initialAuthHeaders])

  useEffect(() => {
    setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0.01])))
  }, [tools])

  const pricesValid = tools.length > 0 && tools.every(t => (priceByTool[t.name] ?? 0) > 0)
  const authHeadersValid = !requireAuth || authHeaders.every(h => (h.key || '').trim() && (h.value || '').trim())

  const filteredTools = useMemo(() => {
    const q = (toolsSearch || "").toLowerCase().trim()
    if (!q) return tools
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    )
  }, [tools, toolsSearch])

  const isTestnetNetworkName = (n: string) => /sepolia|devnet|testnet|fuji|holesky|goerli|amoy|mumbai/i.test(n)
  const evmNetworks = SupportedEVMNetworks
  const svmNetworks = SupportedSVMNetworks
  const visibleEvmNetworks = recipientIsTestnet ? evmNetworks.filter(isTestnetNetworkName) : evmNetworks.filter(n => !isTestnetNetworkName(n))
  const visibleSvmNetworks = recipientIsTestnet ? svmNetworks.filter(isTestnetNetworkName) : svmNetworks.filter(n => !isTestnetNetworkName(n))

  const toggleNetwork = (n: string) => {
    setSelectedNetworks(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  const selectAllVisible = () => {
    const all = [...visibleEvmNetworks, ...visibleSvmNetworks]
    setSelectedNetworks(all)
  }

  const clearNetworks = () => setSelectedNetworks([])

  useEffect(() => {
    setSelectedNetworks(prev => prev.filter(n => recipientIsTestnet ? isTestnetNetworkName(n) : !isTestnetNetworkName(n)))
  }, [recipientIsTestnet])

  const needsEvm = useMemo(() => selectedNetworks.some(n => evmNetworks.includes(n as typeof evmNetworks[number])), [selectedNetworks, evmNetworks])
  const needsSvm = useMemo(() => selectedNetworks.some(n => svmNetworks.includes(n as typeof svmNetworks[number])), [selectedNetworks, svmNetworks])
  const evmValid = !needsEvm || /^0x[a-fA-F0-9]{40}$/.test((evmRecipientAddress || '').trim())
  const svmValid = !needsSvm || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((svmRecipientAddress || '').trim())

  // Filter wallets by architecture
  const evmWallets = useMemo(() => 
    userWallets.filter(wallet => getBlockchainArchitecture(wallet.blockchain) === 'evm'),
    [userWallets]
  )
  const svmWallets = useMemo(() => 
    userWallets.filter(wallet => getBlockchainArchitecture(wallet.blockchain) === 'solana'),
    [userWallets]
  )

  // Unified address input state
  const [evmSuggestionsOpen, setEvmSuggestionsOpen] = useState(false)
  const [svmSuggestionsOpen, setSvmSuggestionsOpen] = useState(false)
  const [evmInputFocused, setEvmInputFocused] = useState(false)
  const [svmInputFocused, setSvmInputFocused] = useState(false)
  const [evmWalletSelectorOpen, setEvmWalletSelectorOpen] = useState(false)
  const [svmWalletSelectorOpen, setSvmWalletSelectorOpen] = useState(false)

  // Helper function to format wallet address for display
  const formatWalletAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Track if user has manually cleared addresses
  const [evmManuallyCleared, setEvmManuallyCleared] = useState(false)
  const [svmManuallyCleared, setSvmManuallyCleared] = useState(false)
  
  // Track if user has manually typed/edited addresses
  const [evmUserEdited, setEvmUserEdited] = useState(false)
  const [svmUserEdited, setSvmUserEdited] = useState(false)

  // Set default selections to primary wallets
  useEffect(() => {
    if (primaryWallet && !evmRecipientAddress && !svmRecipientAddress && !evmManuallyCleared && !svmManuallyCleared && !evmUserEdited && !svmUserEdited) {
      const architecture = getBlockchainArchitecture(primaryWallet.blockchain)
      if (architecture === 'evm' && needsEvm) {
        setEvmRecipientAddress(primaryWallet.walletAddress)
      } else if (architecture === 'solana' && needsSvm) {
        setSvmRecipientAddress(primaryWallet.walletAddress)
      }
    }
  }, [primaryWallet, evmRecipientAddress, svmRecipientAddress, needsEvm, needsSvm, evmManuallyCleared, svmManuallyCleared, evmUserEdited, svmUserEdited])

  // Filter wallets based on input
  const filteredEvmWallets = useMemo(() => {
    if (!evmRecipientAddress) return evmWallets
    const query = evmRecipientAddress.toLowerCase()
    return evmWallets.filter(wallet => 
      wallet.walletAddress.toLowerCase().includes(query) ||
      wallet.blockchain.toLowerCase().includes(query) ||
      wallet.walletType.toLowerCase().includes(query)
    )
  }, [evmWallets, evmRecipientAddress])

  const filteredSvmWallets = useMemo(() => {
    if (!svmRecipientAddress) return svmWallets
    const query = svmRecipientAddress.toLowerCase()
    return svmWallets.filter(wallet => 
      wallet.walletAddress.toLowerCase().includes(query) ||
      wallet.blockchain.toLowerCase().includes(query) ||
      wallet.walletType.toLowerCase().includes(query)
    )
  }, [svmWallets, svmRecipientAddress])

  // Copy address functionality
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 2000)
      toast.success('Address copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  const totalSteps = 4
  const currentLabel = step === 1 ? 'Set Pricing' : step === 2 ? 'Auth' : step === 3 ? 'Networks' : 'Addresses'
  const stepDescription = useMemo(() => {
    switch (step) {
      case 1: return 'Review each tool and set a specific price. You can edit these later.'
      case 2: return 'Configure upstream auth headers (optional).'
      case 3: return 'Choose networks.'
      case 4: return needsEvm && needsSvm ? 'Enter EVM and SVM recipient addresses.' : needsEvm ? 'Enter EVM recipient address.' : 'Enter SVM recipient address.'
      default: return ''
    }
  }, [step, needsEvm, needsSvm])

  const pricesSetCount = useMemo(() => {
    return tools.filter(t => (priceByTool[t.name] ?? 0) > 0).length
  }, [tools, priceByTool])

  // Format currency value to 0.00 format
  const formatCurrency = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return ''
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return ''
    return num.toFixed(2)
  }

  // Handle currency input as cents (right to left)
  // Input is treated as cents being typed from right to left
  const handleCurrencyInput = (inputValue: string, toolName: string | null, setter: (val: number) => void) => {
    // Remove all non-digits to get raw digits
    const digitsOnly = inputValue.replace(/\D/g, '')
    
    // Track digits for this input
    if (toolName) {
      setPriceInputDigits(prev => ({ ...prev, [toolName]: digitsOnly }))
    }
    
    if (digitsOnly === '') {
      setter(0)
      return
    }
    
    // Convert cents to dollars (divide by 100)
    // e.g., "3" -> 0.03, "33" -> 0.33, "333" -> 3.33
    const dollars = parseInt(digitsOnly, 10) / 100
    setter(dollars)
  }

  const Content = (
    <div className={`flex ${isMobile ? 'h-full' : ''} flex-col`}>
      <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
        {step === 1 && (
          <div className="space-y-4 flex flex-col min-h-0">
            {/* SET PRICES Label with count and Bulk Price Input */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-mono">SET PRICES</Label>
                <HighlighterText>{pricesSetCount}/{tools.length}</HighlighterText>
              </div>
              
              {/* Bulk Price Input - Right aligned */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono z-10">$</span>
                  <Input
                    variant="default"
                    type="text"
                    value={bulkPriceInput ? formatCurrency(parseInt(bulkPriceInput, 10) / 100) : ''}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '')
                      setBulkPriceInput(digitsOnly)
                    }}
                    onBlur={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '')
                      if (digitsOnly === '') {
                        setBulkPriceInput('')
                      }
                    }}
                    placeholder="0.00"
                    className="w-24 pl-8 pr-3 text-right bg-background border-border font-mono"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    const digitsOnly = bulkPriceInput.replace(/\D/g, '')
                    if (digitsOnly === '') { toast.error('Enter a positive number'); return }
                    const v = parseInt(digitsOnly, 10) / 100
                    if (v <= 0) { toast.error('Enter a positive number'); return }
                    setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, v])))
                    setBulkPriceInput("")
                  }}
                >
                  APPLY
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0])))
                    setBulkPriceInput("")
                    setPriceInputDigits({})
                  }}
                >
                  CLEAR
                </Button>
              </div>
            </div>

            {/* Tools List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
              {tools.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tools detected.</div>
              ) : (
                tools.map((t) => {
                  const isExpanded = expandedDescriptions.has(t.name)
                  const description = t.description || ''
                  const maxLength = 100
                  const shouldTruncate = description.length > maxLength
                  const displayDescription = isExpanded ? description : (shouldTruncate ? description.slice(0, maxLength) + '...' : description)
                  const priceValue = priceByTool[t.name] ?? 0
                  const hasPrice = priceValue > 0
                  
                  return (
                    <div key={t.name} className={cn("flex gap-4 p-4 rounded-[2px] bg-background border border-muted", isExpanded ? "items-start" : "items-center")}>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium text-foreground mb-1">{t.name}</div>
                        {description && (
                          <div className="text-sm text-muted-foreground">
                            {displayDescription}
                            {shouldTruncate && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newSet = new Set(expandedDescriptions)
                                  if (isExpanded) {
                                    newSet.delete(t.name)
                                  } else {
                                    newSet.add(t.name)
                                  }
                                  setExpandedDescriptions(newSet)
                                }}
                                className="ml-1 font-mono text-muted-foreground underline decoration-dotted hover:text-foreground hover:no-underline"
                              >
                                {isExpanded ? 'LESS' : 'MORE'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="relative shrink-0 self-center">
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-muted-foreground font-mono z-10">$</span>
                          <Input
                            variant="tall"
                            type="text"
                            value={priceInputDigits[t.name] ? formatCurrency(parseInt(priceInputDigits[t.name], 10) / 100) : (priceValue > 0 ? formatCurrency(priceValue) : '')}
                            onChange={(e) => {
                              handleCurrencyInput(e.target.value, t.name, (val) => {
                                setPriceByTool((prev) => ({ ...prev, [t.name]: val }))
                              })
                            }}
                            onBlur={(e) => {
                              const digitsOnly = e.target.value.replace(/\D/g, '')
                              if (digitsOnly === '') {
                                setPriceByTool((prev) => ({ ...prev, [t.name]: 0 }))
                                setPriceInputDigits(prev => {
                                  const next = { ...prev }
                                  delete next[t.name]
                                  return next
                                })
                              }
                            }}
                            placeholder="0.00"
                            className={cn("w-32 pl-8 pr-3 text-right bg-background border-border font-mono", hasPrice && "border-foreground")}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Checkbox id="require-auth2" checked={requireAuth} onCheckedChange={(v) => setRequireAuth(Boolean(v))} />
                <Label htmlFor="require-auth2" className="flex items-center gap-1">Require auth headers
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent align="start">Forward these headers to your upstream MCP server.</TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              {requireAuth && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowValues((v) => !v)} className="shrink-0">
                  {showValues ? (<span className="inline-flex items-center gap-1"><EyeOff className="h-4 w-4" /> Hide values</span>) : (<span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> Show values</span>)}
                </Button>
              )}
            </div>
            
            {!requireAuth && (
              <div className="border border-border rounded-md bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-800/50">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">No authentication required</h4>
                    <p className="text-xs text-muted-foreground">
                      Your MCP server doesn&apos;t require authentication headers. Our proxy server will forward requests directly to your upstream MCP server without any authentication.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">You can enable authentication later if your upstream server requires:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>API key validation</li>
                        <li>Bearer token authentication</li>
                        <li>Custom header forwarding</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {requireAuth && (
              <div className="space-y-4">
                <div className="border border-border rounded-md bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-800/50">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Authentication headers required</h4>
                      <p className="text-xs text-muted-foreground">
                        Configure headers that our proxy server will forward to your upstream MCP server for authentication.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Quick presets:</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAuthHeaders((prev) => [...prev, { key: 'Authorization', value: 'Bearer ' }])} className="text-xs">
                      Authorization: Bearer
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAuthHeaders((prev) => [...prev, { key: 'x-api-key', value: '' }])} className="text-xs">
                      x-api-key
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="text-xs">Paste headers</Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-6rem)]">
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground">Paste lines like &quot;Key: Value&quot; or &quot;Key=Value&quot;.</div>
                          <Textarea 
                            value={bulkHeadersText} 
                            onChange={(e) => setBulkHeadersText(e.target.value)} 
                            placeholder={`Authorization: Bearer sk-xxxx\nx-api-key: abc123`} 
                            className="bg-background border-border text-xs" 
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setBulkHeadersText("")} className="text-xs">Clear</Button>
                            <Button type="button" size="sm" onClick={() => {
                              const lines = (bulkHeadersText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                              const parsed: Array<{ key: string; value: string }> = []
                              for (const line of lines) {
                                const colon = line.indexOf(':')
                                const eq = line.indexOf('=')
                                const idx = colon >= 0 ? colon : eq
                                if (idx < 0) continue
                                const k = line.slice(0, idx).trim()
                                const v = line.slice(idx + 1).trim()
                                if (k) parsed.push({ key: k, value: v })
                              }
                              if (parsed.length > 0) {
                                setAuthHeaders(parsed)
                                setBulkHeadersText("")
                                toast.success('Parsed headers')
                              } else {
                                toast.error('No headers detected')
                              }
                            }} className="text-xs">Parse</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">Configure headers:</div>
                    <div className="space-y-2">
                      {authHeaders.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2 min-w-0 p-2 rounded-md border border-border bg-background">
                          <Input
                            placeholder="Header name (e.g., Authorization)"
                            value={row.key}
                            onChange={(e) => setAuthHeaders((prev) => prev.map((r, i) => i === idx ? { ...r, key: e.target.value } : r))}
                            className="w-48 bg-background border-border text-xs"
                          />
                          <Input
                            placeholder="Header value"
                            type={showValues ? 'text' : 'password'}
                            value={row.value}
                            onChange={(e) => setAuthHeaders((prev) => prev.map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                            className="flex-1 min-w-0 max-w-full bg-background border-border text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setAuthHeaders((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label="Remove header"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAuthHeaders((prev) => [...prev, { key: '', value: '' }])}
                        className="text-xs"
                      >
                        Add header
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center rounded-md border p-0.5">
                <Button type="button" size="sm" variant={recipientIsTestnet ? 'ghost' : 'secondary'} onClick={() => setRecipientIsTestnet(false)} aria-pressed={!recipientIsTestnet}>Mainnet</Button>
                <Button type="button" size="sm" variant={recipientIsTestnet ? 'secondary' : 'ghost'} onClick={() => setRecipientIsTestnet(true)} aria-pressed={recipientIsTestnet} className="inline-flex items-center gap-1"><FlaskConical className="h-4 w-4" /> Testnet</Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>Select all</Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearNetworks}>Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-border rounded-md bg-background p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">EVM</div>
                {visibleEvmNetworks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No EVM networks for this selection.</div>
                ) : (
                  <ul className="space-y-2">
                    {visibleEvmNetworks.map((n) => (
                      <li key={n} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedNetworks.includes(n)} onCheckedChange={() => toggleNetwork(n)} />
                          <span className="truncate text-foreground">{n}</span>
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono border ${isTestnetNetworkName(n)
                            ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50"
                            : "text-muted-foreground bg-muted border-border"
                          }`}>
                          {isTestnetNetworkName(n) ? "testnet" : "mainnet"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border border-border rounded-md bg-background p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">SVM</div>
                {visibleSvmNetworks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No SVM networks for this selection.</div>
                ) : (
                  <ul className="space-y-2">
                    {visibleSvmNetworks.map((n) => (
                      <li key={n} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedNetworks.includes(n)} onCheckedChange={() => toggleNetwork(n)} />
                          <span className="truncate text-foreground">{n}</span>
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono border ${isTestnetNetworkName(n)
                            ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50"
                            : "text-muted-foreground bg-muted border-border"
                          }`}>
                          {isTestnetNetworkName(n) ? "testnet" : "mainnet"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {needsEvm && (
              <div className="space-y-3">
                <Label htmlFor="recipient-evm" className="text-sm">EVM recipient address</Label>
                
                {/* Unified Address Input */}
                <div className="relative">
                  <WalletIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="recipient-evm" 
                    value={evmRecipientAddress} 
                    onChange={(e) => {
                      setEvmRecipientAddress(e.target.value)
                      setEvmSuggestionsOpen(e.target.value.length > 0 && filteredEvmWallets.length > 0)
                      setEvmUserEdited(true)
                      if (e.target.value.length > 0) {
                        setEvmManuallyCleared(false)
                      }
                    }}
                    onFocus={() => {
                      setEvmInputFocused(true)
                      setEvmSuggestionsOpen(evmRecipientAddress.length > 0 && filteredEvmWallets.length > 0)
                    }}
                    onBlur={() => {
                      setEvmInputFocused(false)
                      // Delay closing to allow clicking on suggestions
                      setTimeout(() => setEvmSuggestionsOpen(false), 150)
                    }}
                    placeholder={recipientIsTestnet ? '0x… (testnet) or select from wallets' : '0x… (mainnet) or select from wallets'} 
                    className="pl-10 pr-28 bg-background border-border" 
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {evmWallets.length > 0 && (
                      <Popover open={evmWalletSelectorOpen} onOpenChange={setEvmWalletSelectorOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Select from connected wallets"
                          >
                            <WalletIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <div className="p-4">
                            <h5 className="text-sm font-medium mb-3 text-foreground">Select EVM Wallet</h5>
                            <div className="space-y-2 max-h-60 overflow-auto">
                              {evmWallets
                                .sort((a, b) => {
                                  if (a.isPrimary && !b.isPrimary) return -1
                                  if (!a.isPrimary && b.isPrimary) return 1
                                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                })
                                .map((wallet) => (
                                  <div
                                    key={wallet.id}
                                    onClick={() => {
                                      setEvmRecipientAddress(wallet.walletAddress)
                                      setEvmWalletSelectorOpen(false)
                                      setEvmManuallyCleared(false)
                                      setEvmUserEdited(false)
                                    }}
                                    className={`p-3 rounded-md border cursor-pointer transition-all duration-300 ${
                                      evmRecipientAddress === wallet.walletAddress
                                        ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-800/50'
                                        : 'border-border hover:border-border hover:bg-muted/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <WalletIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-mono text-foreground truncate">{formatWalletAddress(wallet.walletAddress)}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {wallet.isPrimary && (
                                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                            Primary
                                          </Badge>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            copyAddress(wallet.walletAddress)
                                          }}
                                        >
                                          {copiedAddress === wallet.walletAddress ? (
                                            <Check className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {evmRecipientAddress && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyAddress(evmRecipientAddress)}
                        title="Copy address"
                      >
                        {copiedAddress === evmRecipientAddress ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (process.env.NODE_ENV !== 'production') {
                          // eslint-disable-next-line no-console
                          console.log('Clear EVM button clicked')
                        }
                        setEvmRecipientAddress("")
                        setEvmManuallyCleared(true)
                      }}
                      title="Clear address"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Smart Suggestions Dropdown */}
                  {evmSuggestionsOpen && filteredEvmWallets.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Connected wallets</div>
                        {filteredEvmWallets
                          .sort((a, b) => {
                            if (a.isPrimary && !b.isPrimary) return -1
                            if (!a.isPrimary && b.isPrimary) return 1
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          })
                          .slice(0, 5) // Limit to 5 suggestions
                          .map((wallet) => (
                            <div
                              key={wallet.id}
                              onClick={() => {
                                setEvmRecipientAddress(wallet.walletAddress)
                                setEvmSuggestionsOpen(false)
                              }}
                              className="flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-muted/40"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <WalletIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-mono text-foreground truncate">{formatWalletAddress(wallet.walletAddress)}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {wallet.isPrimary && <span className="ml-1 text-primary">• Primary</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {!evmValid ? (
                  <div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Enter a valid EVM address (0x…)</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Used for all selected EVM networks.</div>
                )}
              </div>
            )}
            {needsSvm && (
              <div className="space-y-3">
                <Label htmlFor="recipient-svm" className="text-sm">SVM recipient address</Label>
                
                {/* Unified Address Input */}
                <div className="relative">
                  <WalletIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="recipient-svm" 
                    value={svmRecipientAddress} 
                    onChange={(e) => {
                      setSvmRecipientAddress(e.target.value)
                      setSvmSuggestionsOpen(e.target.value.length > 0 && filteredSvmWallets.length > 0)
                      setSvmUserEdited(true)
                      if (e.target.value.length > 0) {
                        setSvmManuallyCleared(false)
                      }
                    }}
                    onFocus={() => {
                      setSvmInputFocused(true)
                      setSvmSuggestionsOpen(svmRecipientAddress.length > 0 && filteredSvmWallets.length > 0)
                    }}
                    onBlur={() => {
                      setSvmInputFocused(false)
                      // Delay closing to allow clicking on suggestions
                      setTimeout(() => setSvmSuggestionsOpen(false), 150)
                    }}
                    placeholder={recipientIsTestnet ? 'Devnet address or select from wallets' : 'Mainnet address or select from wallets'} 
                    className="pl-10 pr-28 bg-background border-border" 
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {svmWallets.length > 0 && (
                      <Popover open={svmWalletSelectorOpen} onOpenChange={setSvmWalletSelectorOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Select from connected wallets"
                          >
                            <WalletIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <div className="p-4">
                            <h5 className="text-sm font-medium mb-3 text-foreground">Select SVM Wallet</h5>
                            <div className="space-y-2 max-h-60 overflow-auto">
                              {svmWallets
                                .sort((a, b) => {
                                  if (a.isPrimary && !b.isPrimary) return -1
                                  if (!a.isPrimary && b.isPrimary) return 1
                                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                })
                                .map((wallet) => (
                                  <div
                                    key={wallet.id}
                                    onClick={() => {
                                      setSvmRecipientAddress(wallet.walletAddress)
                                      setSvmWalletSelectorOpen(false)
                                      setSvmManuallyCleared(false)
                                      setSvmUserEdited(false)
                                    }}
                                    className={`p-3 rounded-md border cursor-pointer transition-all duration-300 ${
                                      svmRecipientAddress === wallet.walletAddress
                                        ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-800/50'
                                        : 'border-border hover:border-border hover:bg-muted/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <WalletIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-mono text-foreground truncate">{formatWalletAddress(wallet.walletAddress)}</div>
                                          <div className="text-xs text-muted-foreground truncate">
                                            {wallet.blockchain} • {wallet.walletType}
                                            {wallet.isPrimary && <span className="ml-1 text-primary">• Primary</span>}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {wallet.isPrimary && (
                                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                            Primary
                                          </Badge>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            copyAddress(wallet.walletAddress)
                                          }}
                                        >
                                          {copiedAddress === wallet.walletAddress ? (
                                            <Check className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {svmRecipientAddress && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyAddress(svmRecipientAddress)}
                        title="Copy address"
                      >
                        {copiedAddress === svmRecipientAddress ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (process.env.NODE_ENV !== 'production') {
                          // eslint-disable-next-line no-console
                          console.log('Clear SVM button clicked')
                        }
                        setSvmRecipientAddress("")
                        setSvmManuallyCleared(true)
                      }}
                      title="Clear address"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Smart Suggestions Dropdown */}
                  {svmSuggestionsOpen && filteredSvmWallets.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Connected wallets</div>
                        {filteredSvmWallets
                          .sort((a, b) => {
                            if (a.isPrimary && !b.isPrimary) return -1
                            if (!a.isPrimary && b.isPrimary) return 1
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          })
                          .slice(0, 5) // Limit to 5 suggestions
                          .map((wallet) => (
                            <div
                              key={wallet.id}
                              onClick={() => {
                                setSvmRecipientAddress(wallet.walletAddress)
                                setSvmSuggestionsOpen(false)
                              }}
                              className="flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-muted/40"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <WalletIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-mono text-foreground truncate">{formatWalletAddress(wallet.walletAddress)}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {wallet.blockchain} • {wallet.walletType}
                                    {wallet.isPrimary && <span className="ml-1 text-primary">• Primary</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {!svmValid ? (
                  <div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Enter a valid SVM address</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Used for all selected SVM networks.</div>
                )}
              </div>
            )}
            {!needsEvm && !needsSvm && (
              <div className="text-xs text-muted-foreground">No networks selected.</div>
            )}
          </div>
        )}
      </div>

      {/* Actions are rendered in DialogFooter/DrawerFooter */}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col rounded-[2px]">
          <DrawerHeader className="pb-6">
            <DrawerTitle className="text-lg sm:text-xl lg:text-2xl font-bold font-host text-foreground leading-tight">{currentLabel}</DrawerTitle>
            <div className="text-base font-inter text-muted-foreground mt-1">{stepDescription}</div>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-auto px-4">{Content}</div>
          <DrawerFooter>
            <div className="flex items-center justify-between w-full gap-3">
              <Button 
                variant="secondary"
                onClick={step === 1 ? () => onOpenChange(false) : () => setStep((s) => (s > 1 ? (s - 1) as typeof step : s))} 
                size="tall"
                className="w-48 flex-shrink-0"
              >
                {step === 1 ? 'CANCEL' : 'BACK'}
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-mono">STEP</Label>
                <span className="text-sm font-mono text-muted-foreground">{step}/{totalSteps}</span>
              </div>
              {step < 4 ? (
                <Button 
                  variant="default"
                  onClick={() => setStep((s) => (s < 4 ? (s + 1) as typeof step : s))} 
                  disabled={(step === 1 && !pricesValid) || (step === 2 && !authHeadersValid) || (step === 3 && selectedNetworks.length === 0)}
                  size="tall"
                  className="w-48 flex-shrink-0"
                >
                  NEXT
                </Button>
              ) : (
                <Button 
                  variant="default"
                  onClick={async () => { setLoading(true); try { await onCreate({ prices: priceByTool, evmRecipientAddress, svmRecipientAddress, networks: selectedNetworks, requireAuth, authHeaders: Object.fromEntries(authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])), testnet: recipientIsTestnet }); onOpenChange(false); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create'); } finally { setLoading(false) } }} 
                  disabled={loading || (needsEvm && !evmValid) || (needsSvm && !svmValid)}
                  size="tall"
                  className="w-48 flex-shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating
                    </>
                  ) : (
                    'CREATE'
                  )}
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[min(96vw,900px)] min-h-[80vh] max-h-[80vh] flex flex-col rounded-[2px]">
        <DialogHeader className="pb-6">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold font-host text-foreground leading-tight">{currentLabel}</h2>
            <div className="text-base font-inter text-muted-foreground">{stepDescription}</div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">{Content}</div>
        <DialogFooter>
          <div className="flex items-center justify-between w-full gap-3">
            <Button 
              variant="secondary"
              onClick={step === 1 ? () => onOpenChange(false) : () => setStep((s) => (s > 1 ? (s - 1) as typeof step : s))} 
              size="tall"
              className="!w-48"
            >
              {step === 1 ? 'CANCEL' : 'BACK'}
            </Button>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-mono">STEP</Label>
              <span className="text-sm font-mono text-muted-foreground">{step}/{totalSteps}</span>
            </div>
            {step < 4 ? (
              <Button 
                variant="default"
                onClick={() => setStep((s) => (s < 4 ? (s + 1) as typeof step : s))} 
                disabled={(step === 1 && !pricesValid) || (step === 2 && !authHeadersValid) || (step === 3 && selectedNetworks.length === 0)}
                size="tall"
                className="w-48 flex-shrink-0"
              >
                NEXT
              </Button>
            ) : (
              <Button 
                variant="default"
                onClick={async () => { setLoading(true); try { await onCreate({ prices: priceByTool, evmRecipientAddress, svmRecipientAddress, networks: selectedNetworks, requireAuth, authHeaders: Object.fromEntries(authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])), testnet: recipientIsTestnet }); onOpenChange(false); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create'); } finally { setLoading(false) } }} 
                disabled={loading || (needsEvm && !evmValid) || (needsSvm && !svmValid)}
                size="tall"
                className="w-48 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating
                  </>
                ) : (
                  'CREATE'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
