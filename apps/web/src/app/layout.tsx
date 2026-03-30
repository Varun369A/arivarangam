import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Arivarangam — AI Code Generator & Development Platform India',
    template: '%s | Arivarangam',
  },
  description:
    'Arivarangam is India\'s AI-powered development platform. Generate code, create images, do research, and build apps automatically using AI agents. No coding experience needed.',
  keywords: [
    'AI code generator India',
    'AI development platform',
    'generate code with AI',
    'AI app builder',
    'no code AI platform',
    'AI website builder India',
    'automatic code generation',
    'AI programming assistant',
    'AI coding assistant',
    'AI agent platform',
    'build app with AI',
    'AI software development',
    'AI research tool',
    'AI image generation',
    'AI content generation',
    'arivarangam',
    'free AI coding',
    'AI developer tool India',
    'code generation platform',
    'AI productivity tool',
  ],
  authors: [{ name: 'Arivarangam' }],
  creator: 'Arivarangam',
  publisher: 'Arivarangam',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://arivarangam.com'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://arivarangam.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://arivarangam.com',
    title: 'Arivarangam — AI Code Generator & Development Platform',
    description: 'Generate full code projects, research reports, images and content using AI. Built for Indian developers and creators.',
    siteName: 'Arivarangam',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Arivarangam — AI Development Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arivarangam — AI Code Generator India',
    description: 'Generate full code projects, research, images and content using AI. Built for Indian developers.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4F46E5',
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3CL1MZL6DS"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3CL1MZL6DS');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
