import type { Metadata } from 'next'
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
    default: 'Arrivarangam — AI-Powered Development Platform',
    template: '%s | Arrivarangam',
  },
  description:
    'Arrivarangam is an AI-powered platform that helps you build, manage, and deploy code with intelligent agents.',
  keywords: ['AI', 'code generation', 'development', 'automation', 'agents'],
  authors: [{ name: 'Arrivarangam' }],
  creator: 'Arrivarangam',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Arrivarangam — AI-Powered Development Platform',
    description: 'Build faster with AI agents that understand your codebase.',
    siteName: 'Arrivarangam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arrivarangam',
    description: 'Build faster with AI agents that understand your codebase.',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
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
