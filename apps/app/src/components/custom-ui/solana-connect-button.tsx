"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle } from 'lucide-react'

interface WindowWithSolana extends Window {
  solana?: {
    isPhantom?: boolean
  }
}

export function SolanaConnectButton() {
  const { wallet, connect, disconnect, connecting, connected, publicKey } = useWallet()
  
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const handleConnect = useCallback(async () => {
    try {
      setConnectionError(null)
      await connect()
    } catch (error) {
      console.error('Solana connection failed:', error)
      setConnectionError(error instanceof Error ? error.message : 'Connection failed. Please try again.')
    }
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setConnectionError(null)
  }, [disconnect])

  // Clear error after some time
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => setConnectionError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [connectionError])

  // Check if Phantom wallet is available
  const isPhantomAvailable = useMemo(() => {
    if (typeof window === 'undefined') return false
    return !!(window as WindowWithSolana).solana?.isPhantom
  }, [])

  if (!isPhantomAvailable) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Phantom wallet not detected. Please install Phantom wallet extension.</span>
        </div>
        <Button
          onClick={() => window.open('https://phantom.app/', '_blank', 'noopener')}
          variant="outline"
          className="w-full h-11 text-[15px] font-medium"
        >
          Install Phantom
        </Button>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        {connectionError && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/50 border border-red-200 rounded-lg p-3">
            {connectionError}
          </div>
        )}
        
        <Button
          onClick={handleConnect}
          disabled={connecting}
          variant="outline"
          className="w-full h-11 text-[15px] font-medium"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            'Connect Phantom'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {connectionError && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/50 border border-red-200 rounded-lg p-3">
          {connectionError}
        </div>
      )}
      
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {wallet?.adapter?.name || 'Solana Wallet'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Solana
          </Badge>
        </div>
        
        {publicKey && (
          <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
          </div>
        )}
      </div>
      
      <Button
        onClick={handleDisconnect}
        variant="outline"
        className="w-full h-10"
      >
        Disconnect
      </Button>
    </div>
  )
}

