import { cn } from "@/lib/utils"

/**
 * Skeleton placeholder for loading states.
 * Renders a pulsing gray block that can be sized via className.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
