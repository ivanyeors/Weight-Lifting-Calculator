"use client"

import Link from 'next/link'

export function HomeFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Fitspo. All rights reserved.</p>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/home/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/home/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}


