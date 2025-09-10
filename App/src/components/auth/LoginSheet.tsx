"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FlickeringGrid } from '@/components/ui/shadcn-io/flickering-grid'
import { LoginForm } from '@/app/account/login-form'

export function LoginSheet({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess?: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        animation="fade"
        className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0 [&_[data-slot=sheet-close]]:z-[60]"
        overlayClassName="!bg-transparent"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Sign In</SheetTitle>
        </SheetHeader>
        <div className="absolute inset-0 z-0 pointer-events-none">
          <FlickeringGrid
            squareSize={4}
            gridGap={6}
            flickerChance={0.3}
            color="#283DFF"
            maxOpacity={0.6}
            className="w-full h-full opacity-80"
          />
        </div>

        <div className="absolute inset-x-0 top-4 bottom-0 z-10 flex min-h-full flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm md:max-w-3xl">
            <LoginForm onSuccess={onSuccess} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


