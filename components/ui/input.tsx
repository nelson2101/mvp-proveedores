import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'focus-ring h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-400',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'
