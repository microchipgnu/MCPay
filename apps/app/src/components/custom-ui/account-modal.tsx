"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer"
import { AlertCircle, Github, Loader2 } from "lucide-react"
import Image from "next/image"
import { signIn, useSession } from "@/lib/client/auth"
import { UserAccountPanel } from "@/components/custom-ui/user-modal"

// Keep the same external API
type AccountModalProps = {
  isOpen: boolean
  onClose: (open: boolean) => void
  defaultTab?: "wallets" | "developer"
}

export function AccountModal({ isOpen, onClose, defaultTab }: AccountModalProps) {
  const { data: session, isPending: sessionLoading } = useSession()
  const { isDark } = useTheme()

  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [detectedTab, setDetectedTab] = useState<"wallets" | "developer" | undefined>(undefined)

  // Deprecated iframe approach removed in favor of in-app panel

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Hash detection for tab selection
  useEffect(() => {
    const detectTabFromHash = () => {
      const hash = window.location.hash
      if (hash === "#account-developer") {
        setDetectedTab("developer")
      } else if (hash === "#account-wallet") {
        setDetectedTab("wallets")
      } else {
        setDetectedTab(undefined)
      }
    }

    // Check hash on mount
    detectTabFromHash()

    // Listen for hash changes
    window.addEventListener("hashchange", detectTabFromHash)
    return () => window.removeEventListener("hashchange", detectTabFromHash)
  }, [])

  // Legacy iframe message listener no longer needed

  const handleGitHubSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
      // Keep loading state - page will reload after successful authentication
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")
    try {
      await signIn.social({ provider: "google", callbackURL: window.location.href })
      // Keep loading state - page will reload after successful authentication
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  // Keep loading state until page reloads after successful authentication

  const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[280px] space-y-6 p-6">
      {/* Enhanced loading spinner */}
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDark ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-lg" : "bg-gradient-to-br from-gray-100 to-gray-50 shadow-md"}`}>
        <Loader2 className={`h-8 w-8 sm:h-10 sm:w-10 animate-spin ${isDark ? "text-gray-200" : "text-gray-700"}`} style={{ animationDuration: '0.5s' }} />
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse`} />
      </div>
      
      {message && (
        <div className="text-center space-y-3">
          <h2 className={`text-xl sm:text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {message}
          </h2>
          <p className={`text-sm sm:text-base max-w-md mx-auto leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Please wait while we authenticate your account...
          </p>
        </div>
      )}
    </div>
  )


  const GitHubSignIn = () => (
    <div className="flex flex-col h-full p-6 sm:p-8">
      {/* Header Section - Top */}
      <div className="text-center space-y-6">
        {/* Enhanced MCPay Symbol Icon */}
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center transition-all duration-300 ${isDark ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-lg" : "bg-gradient-to-br from-gray-100 to-gray-50 shadow-md"}`}>
          <div className={`relative w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${isDark ? "opacity-90" : "opacity-100"}`}>
            <Image
              src={isDark ? "/MCPay-symbol-light.svg" : "/MCPay-symbol-dark.svg"}
              alt="MCPay Symbol"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse`} />
        </div>
        
        {/* Title and Description */}
        <div className="space-y-3">
          <h2 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Welcome to MCPay</h2>
          <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Sign in to access your account dashboard and manage your wallets & API keys.
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Login Section - Bottom */}
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${isDark ? "bg-red-950/50 border-red-800/50 shadow-lg" : "bg-red-50 border-red-200 shadow-md"}`}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${isDark ? "bg-red-800/50 text-red-400" : "bg-red-500/10 text-red-600"}`}>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Authentication Error</h4>
                  <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Login Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isAuthenticating}
            className={`group relative overflow-hidden w-full h-12 sm:h-14 text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
              isDark 
                ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border border-gray-600 hover:border-gray-500" 
                : "bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white border border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {isLoading || isAuthenticating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="transition-all duration-300">
                {isLoading || isAuthenticating ? "Signing you in..." : "Continue with Google"}
              </span>
            </div>
            
            {/* Button shimmer effect */}
            <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ${
              isDark ? "bg-gradient-to-r from-transparent via-white/10 to-transparent" : "bg-gradient-to-r from-transparent via-white/20 to-transparent"
            }`} />
          </Button>

          <Button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={isLoading || isAuthenticating}
            variant="outline"
            className={`group relative overflow-hidden w-full h-12 sm:h-14 text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
              isDark 
                ? "border-gray-600 hover:border-gray-500 text-white hover:bg-gray-800/50" 
                : "border-gray-300 hover:border-gray-400 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {isLoading || isAuthenticating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              )}
              <span className="transition-all duration-300">
                {isLoading || isAuthenticating ? "Signing you in..." : "Continue with GitHub"}
              </span>
            </div>
            
            {/* Button shimmer effect */}
            <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ${
              isDark ? "bg-gradient-to-r from-transparent via-white/5 to-transparent" : "bg-gradient-to-r from-transparent via-gray-100/50 to-transparent"
            }`} />
          </Button>
        </div>

        {/* Footer */}
        <div className={`text-center space-y-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <p className="text-sm leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )

  const Frame = () => <UserAccountPanel isActive={true} initialTab={detectedTab || defaultTab} />

  // Show loading during session loading or authentication flow
  if (sessionLoading || isAuthenticating) {
    const loadingMessage = isAuthenticating ? "Signing you in..." : sessionLoading ? "Loading your account..." : undefined

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <LoadingSpinner message={loadingMessage} />
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <LoadingSpinner message={loadingMessage} />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          {!session?.user ? <DrawerHeader /> : null}
          <div className="flex-1 overflow-hidden">
            {session?.user ? <Frame /> : <GitHubSignIn />}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        {!session?.user ? (
          <DialogHeader />
        ) : null}
        <div className="flex-1 overflow-hidden">
          {session?.user ? <Frame /> : <GitHubSignIn />}
        </div>
      </DialogContent>
    </Dialog>
  )
}