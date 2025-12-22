/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-slate-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none sm:focus-visible:ring-1 sm:focus-visible:ring-zinc-950 sm:focus-visible:ring-offset-1 cursor-text disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#151b2e] dark:text-slate-200 dark:placeholder:text-zinc-400 dark:sm:focus-visible:ring-indigo-400",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
