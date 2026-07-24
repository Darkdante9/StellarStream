import "./globals.css"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "StellarStream - Bulk Payment Processing",
  description: "Advanced bulk payment processing with recipient grid and bulk-edit tools",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 animate-fade-in-down">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-bold text-primary-600">
                  StellarStream
                </Link>
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Payments
                </Link>
                <Link
                  href="/escrow"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Escrow
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  )
}
