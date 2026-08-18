import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'FilterBridge — Next.js App Router example',
  description: 'Server parse, client state, back/forward',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
