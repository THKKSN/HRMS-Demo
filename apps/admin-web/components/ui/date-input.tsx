'use client'

import { forwardRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative">
        <CalendarDays className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={ref}
          type="date"
          className={cn(
            'flex h-9 w-full rounded-md border bg-background pl-8 pr-3 py-1 text-sm shadow-xs',
            'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive' : 'border-border',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)
DateInput.displayName = 'DateInput'

export { DateInput }
