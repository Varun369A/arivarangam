import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Arivarangam — AI-Powered Development Platform',
    template: '%s | Arivarangam',
  },
  description:
    'Arivarangam is an AI-powered platform that helps you build, manage, and deploy code with intelligent agents.',
  keywords: ['AI', 'code generation', 'development', 'automation', 'agents'],
  authors: [{ name: 'Arivarangam' }],
  creator: 'Arivarangam',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Arivarangam — AI-Powered Development Platform',
    description: 'Build faster with AI agents that understand your codebase.',
    siteName: 'Arivarangam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arivarangam',
    description: 'Build faster with AI agents that understand your codebase.',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3461',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="min-h-screen bg-surface font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
