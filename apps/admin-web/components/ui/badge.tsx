import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

const variantClass: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary',
  secondary: 'bg-whited text-muted-foreground',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  destructive: 'bg-red-100 text-red-700',
  outline: 'border border-border bg-transparent text-foreground',
  info: 'bg-cyan-100 text-cyan-700',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  )
}
