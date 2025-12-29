import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'n8n Streaming Chat',
  description: 'Streaming chat interface for n8n AI workflows',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
