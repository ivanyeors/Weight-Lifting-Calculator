"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-6P9R4044ZG'

function sendPageView(url: string) {
  if (typeof window === "undefined") return
  const w = window as any
  w.dataLayer = w.dataLayer || []
  const gtag = (...args: any[]) => w.dataLayer.push(args)
  // GA4 recommended: use config on route change with page_path
  try {
    gtag("config", GA_ID, {
      page_path: url,
      transport_type: "beacon",
    })
  } catch {
    // no-op
  }
}

export default function GATrackPageViews() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const url = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
    if (url === lastUrlRef.current) return
    lastUrlRef.current = url
    sendPageView(url)
  }, [pathname, searchParams])

  return null
}
