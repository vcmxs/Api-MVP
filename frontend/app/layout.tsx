import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import Script from 'next/script'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dupla - Fitness Coaching Dashboard',
  description: 'Premium fitness coaching platform for managing trainees, workouts, and programs',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-[#0a0a0f]">
      <body className="font-sans antialiased bg-[#0a0a0f]">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Providers>{children}</Providers>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
