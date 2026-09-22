import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Preflight — simulate a Meteora DBC before launch',
  description:
    'Configure a Meteora Dynamic Bonding Curve, simulate snipers, whales and organic buyers against it, and see who ends up holding the token — before real money hits the curve.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
