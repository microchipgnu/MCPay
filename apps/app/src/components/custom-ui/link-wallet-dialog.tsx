"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectButton } from './connect-button'
import { SolanaConnectButton } from './solana-connect-button'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/components/providers/user'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-context'

type LinkWalletDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWalletLinked?: () => void
}

export function LinkWalletDialog({ open, onOpenChange, onWalletLinked }: LinkWalletDialogProps) {
  const { isDark } = useTheme()
  const { addWallet } = useUser()
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount()
  const { publicKey: solanaPublicKey, connected: isSolanaConnected } = useWallet()
  
  const [activeTab, setActiveTab] = useState<'evm' | 'solana'>('evm')
  const [isLinking, setIsLinking] = useState(false)
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null)

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setLinkedAddress(null)
      setIsLinking(false)
    }
  }, [open])

  // Auto-link when wallet connects
  useEffect(() => {
    if (!open || isLinking) return

    const linkWallet = async () => {
      try {
        if (activeTab === 'evm' && isEvmConnected && evmAddress && !linkedAddress) {
          setIsLinking(true)
          setLinkedAddress(evmAddress)
          
          await addWallet({
            walletAddress: evmAddress,
            blockchain: 'base', // Default to base, user can change later if needed
            walletType: 'external',
            provider: 'metamask', // Could be improved to detect actual provider
            isPrimary: false, // Don't auto-set as primary
          })
          
          toast.success('EVM wallet linked successfully')
          setIsLinking(false)
          onWalletLinked?.()
          // Close dialog after a short delay
          setTimeout(() => {
            onOpenChange(false)
          }, 1000)
        } else if (activeTab === 'solana' && isSolanaConnected && solanaPublicKey && !linkedAddress) {
          setIsLinking(true)
          const address = solanaPublicKey.toString()
          setLinkedAddress(address)
          
          await addWallet({
            walletAddress: address,
            blockchain: 'solana',
            walletType: 'external',
            provider: 'phantom',
            isPrimary: false, // Don't auto-set as primary
          })
          
          toast.success('Solana wallet linked successfully')
          setIsLinking(false)
          onWalletLinked?.()
          // Close dialog after a short delay
          setTimeout(() => {
            onOpenChange(false)
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to link wallet:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to link wallet')
        setIsLinking(false)
        setLinkedAddress(null)
      }
    }

    linkWallet()
  }, [open, activeTab, isEvmConnected, evmAddress, isSolanaConnected, solanaPublicKey, linkedAddress, isLinking, addWallet, onOpenChange, onWalletLinked])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            Link Wallet
          </DialogTitle>
        </DialogHeader>
        
        {isLinking ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Linking wallet...
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'evm' | 'solana')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evm">EVM</TabsTrigger>
              <TabsTrigger value="solana">Solana</TabsTrigger>
            </TabsList>
            
            <TabsContent value="evm" className="mt-4">
              <ConnectButton />
            </TabsContent>
            
            <TabsContent value="solana" className="mt-4">
              <SolanaConnectButton />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

