import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared layout wrapper for all authentication pages.
 * Provides a consistent dark-gradient background, centered card,
 * and structured logo — replacing the fragile emoji-based logo.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-4">
          {/* Structured logo */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Catetin Duit</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm">{description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {children}
        </CardContent>

        {footer && (
          <CardFooter className="text-center text-sm justify-center pb-6">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
