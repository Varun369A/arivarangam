import type { Metadata } from 'next'
import { MainNavbar } from '@/components/MainNavbar'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | Arivarangam',
  },
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <MainNavbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
