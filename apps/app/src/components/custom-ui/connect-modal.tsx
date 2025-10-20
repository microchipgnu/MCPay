"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Github, Loader2 } from "lucide-react"
import { signIn } from "@/lib/client/auth"

type ConnectModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")

  async function handleGitHubSignIn() {
    setError("")
    setIsLoading(true)
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError("")
    setIsLoading(true)
    try {
      await signIn.social({ provider: "google", callbackURL: window.location.href })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sign in to authorize the application</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose your preferred sign-in method</p>
          </div>
          {error ? (
            <div className="w-full text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          ) : null}
          <div className="w-full space-y-3">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-11 text-[15px] font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : (
                <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {isLoading ? "Signing you in..." : "Sign in with Google"}
            </Button>
            <Button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              variant="outline"
              className="w-full h-11 text-[15px] font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Github className="h-4 w-4 mr-3" />}
              {isLoading ? "Signing you in..." : "Sign in with GitHub"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConnectModal


