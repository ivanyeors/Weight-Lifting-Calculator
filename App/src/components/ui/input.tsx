import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type InputProps = React.ComponentProps<"input"> & {
  withStepper?: boolean
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, withStepper = true, step, min, max, wrapperClassName, ...props },
  forwardedRef
) {
  const localRef = useRef<HTMLInputElement>(null)
  // Merge refs
  useEffect(() => {
    if (!forwardedRef) return
    if (typeof forwardedRef === "function") {
      forwardedRef(localRef.current)
    } else {
      ;(forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = localRef.current
    }
  }, [forwardedRef])

  const isNumber = type === "number"

  // Keep +/- buttons the same height as the input, even if custom height classes are applied
  const [controlHeight, setControlHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!isNumber || !withStepper) return
    const el = localRef.current
    if (!el) return
    const update = () => setControlHeight(el.offsetHeight || undefined)
    update()
    const RO = typeof window !== "undefined" && (window as any).ResizeObserver ? (window as any).ResizeObserver : undefined
    const ro = RO ? new RO(update) : undefined
    if (ro && el) ro.observe(el)
    return () => {
      if (ro && el) ro.unobserve(el)
    }
  }, [isNumber, withStepper])

  // Helpers to adjust value using step/min/max and trigger React onChange
  const numericStep = useMemo(() => {
    const s = typeof step === "string" ? parseFloat(step) : step
    return Number.isFinite(s as number) && (s as number) > 0 ? (s as number) : 1
  }, [step])

  const clamp = (v: number) => {
    const nMin = typeof min === "string" ? parseFloat(min) : (min as number | undefined)
    const nMax = typeof max === "string" ? parseFloat(max) : (max as number | undefined)
    if (Number.isFinite(nMin as number)) v = Math.max(v, nMin as number)
    if (Number.isFinite(nMax as number)) v = Math.min(v, nMax as number)
    return v
  }

  const emitChange = (next: number) => {
    const el = localRef.current
    if (!el) return
    el.value = String(next)
    const ev = new Event("input", { bubbles: true })
    el.dispatchEvent(ev)
  }

  const numberSpinStyles = (
    <style jsx global>{`
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type="number"] {
        -moz-appearance: textfield;
      }
    `}</style>
  )

  if (isNumber && withStepper) {
    return (
      <div className={cn("flex items-center gap-1", wrapperClassName ?? "w-full")}> 
        <Button
          type="button"
          variant="outline"
          className={cn("w-9 p-0", controlHeight ? undefined : "h-9")}
          style={controlHeight ? { height: controlHeight } : undefined}
          onClick={() => {
            const current = parseFloat(localRef.current?.value || "0") || 0
            emitChange(clamp(current - numericStep))
          }}
          aria-label="Decrease"
        >
          −
        </Button>
        <input
          ref={localRef}
          type="number"
          data-slot="input"
          step={step}
          min={min}
          max={max}
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            "appearance-none",
            className
          )}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          className={cn("w-9 p-0", controlHeight ? undefined : "h-9")}
          style={controlHeight ? { height: controlHeight } : undefined}
          onClick={() => {
            const current = parseFloat(localRef.current?.value || "0") || 0
            emitChange(clamp(current + numericStep))
          }}
          aria-label="Increase"
        >
          +
        </Button>
        {numberSpinStyles}
      </div>
    )
  }

  return (
    <input
      ref={localRef}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
})

export { Input }
