import { ReactNode } from 'react'
import Image from 'next/image'

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Immersive auth wrapper — rich dark-green gradient background with
 * animated floating orbs and a frosted-glass card overlay.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.20 0.07 163) 0%, oklch(0.13 0.032 162) 50%, oklch(0.09 0.02 165) 100%)',
      }}
    >
      {/* ── Animated background orbs ──────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Top-left large orb */}
        <div
          className="absolute -top-[18%] -left-[12%] h-[580px] w-[580px] rounded-full animate-float"
          style={{
            background:
              'radial-gradient(circle, oklch(0.48 0.128 162 / 0.28) 0%, transparent 65%)',
          }}
        />
        {/* Bottom-right orb */}
        <div
          className="absolute -bottom-[22%] -right-[10%] h-[520px] w-[520px] rounded-full animate-float-delayed"
          style={{
            background:
              'radial-gradient(circle, oklch(0.65 0.155 162 / 0.20) 0%, transparent 65%)',
          }}
        />
        {/* Mid-right accent orb */}
        <div
          className="absolute top-[38%] right-[12%] h-[300px] w-[300px] rounded-full animate-float-slow"
          style={{
            background:
              'radial-gradient(circle, oklch(0.72 0.14 162 / 0.14) 0%, transparent 70%)',
          }}
        />
        {/* Subtle noise grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>

      {/* ── Glass card ────────────────────────────────────────── */}
      <div className="relative w-full max-w-[420px] animate-fade-in-up">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.93)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow:
              '0 32px 80px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.55) inset',
          }}
        >
          {/* Card body */}
          <div className="px-7 pt-8 pb-6 space-y-5">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0"
                  style={{ boxShadow: '0 4px 18px oklch(0.48 0.128 162 / 0.45)' }}
                >
                  <Image
                    src="/logo.png"
                    alt="Catetin Duit"
                    width={24}
                    height={24}
                    className="rounded-md"
                  />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Catetin Duit
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>

            {/* Slot: form content */}
            <div className="space-y-4">{children}</div>
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-7 pt-4 pb-7 text-center text-sm border-t border-border/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
