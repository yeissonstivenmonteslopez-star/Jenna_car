import type { Metadata, Viewport } from 'next'
import SiteShell from '@/components/site-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jenna Car — Cuidado automotriz premium',
  description: 'Un nuevo estándar de confianza y excelencia para tu vehículo.',
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#171717' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="bg-background">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}