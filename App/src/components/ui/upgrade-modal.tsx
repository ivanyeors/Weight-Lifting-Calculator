"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Lock, Crown, Zap } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  feature: string
  currentLimit?: string
  benefits?: string[]
}

export function UpgradeModal({
  open,
  onOpenChange,
  title,
  description,
  feature,
  currentLimit,
  benefits = [
    "Unlimited custom exercises",
    "Cloud synchronization",
    "Advanced analytics",
    "Priority support"
  ]
}: UpgradeModalProps) {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleUpgrade = () => {
    setIsRedirecting(true)
    router.push('/account?tab=billing#plans')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentLimit && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Current Limit
              </div>
              <div className="text-sm">{currentLimit}</div>
            </div>
          )}

          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Upgrade to unlock {feature}</span>
            </div>

            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleUpgrade}
              disabled={isRedirecting}
              className="w-full"
            >
              {isRedirecting ? 'Redirecting...' : 'View Upgrade Options'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
