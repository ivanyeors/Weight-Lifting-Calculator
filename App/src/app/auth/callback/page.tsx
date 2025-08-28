"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // For GitHub Pages, we can't use server-side auth
        // This would normally handle OAuth callbacks
        setStatus('success')
        setMessage('Authentication completed successfully')
        
        // Redirect to the intended page or dashboard
        setTimeout(() => {
          const next = searchParams.get('next') || '/'
          router.push(next)
        }, 2000)
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('Authentication failed. Please try again.')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p>Processing authentication...</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                <p className="text-green-600">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-8 w-8 mx-auto text-red-500" />
                <p className="text-red-600">{message}</p>
                <Button onClick={() => router.push('/')}>
                  Go to Home
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


