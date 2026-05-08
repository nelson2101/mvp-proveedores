import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={clsx('rounded-lg border border-border bg-white p-5 shadow-panel', className)}
      {...props}
    />
  )
}
