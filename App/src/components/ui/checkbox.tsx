import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type CheckboxVariant = "default" | "chip"

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  variant?: CheckboxVariant
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, variant = "default", children, ...props }, ref) {
  const baseDefault = "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:brightness-95 data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-5 shrink-0 rounded-[4px] border-2 shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
  const baseChip = "inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-muted/80 data-[state=checked]:text-foreground data-[state=checked]:border-primary/70 data-[state=checked]:ring-2 data-[state=checked]:ring-primary/70 transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 pl-3 pr-4 py-2"

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      data-haptic="light"
      className={cn(variant === "chip" ? baseChip : baseDefault, className)}
      {...props}
    >
      {variant === "chip" && children ? (
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">{children}</span>
      ) : null}
      {variant === "chip" ? (
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className={cn("ml-2 flex items-center justify-center text-primary drop-shadow-sm transition-none shrink-0 data-[state=checked]:text-primary")}
        >
          <CheckIcon className="size-4" />
        </CheckboxPrimitive.Indicator>
      ) : (
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current transition-none"
        >
          <CheckIcon className="size-4" />
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  )
})

export { Checkbox }
