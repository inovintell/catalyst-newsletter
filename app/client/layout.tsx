import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastContainer } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InovIntell Newsletter Generator',
  description: 'AI for life sciences - Newsletter Generation Tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-inovintell-gradient rounded-lg mr-3"></div>
                      <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-inovintell-blue to-inovintell-green bg-clip-text text-transparent">
                          InovIntell
                        </h1>
                        <p className="text-xs text-gray-500">AI for life sciences!</p>
                      </div>
                    </div>
                  </div>
                  <nav className="ml-10 flex space-x-4">
                    <a href="/" className="text-gray-700 hover:text-inovintell-blue px-3 py-2 rounded-md text-sm font-medium">
                      Dashboard
                    </a>
                    <a href="/sources" className="text-gray-700 hover:text-inovintell-blue px-3 py-2 rounded-md text-sm font-medium">
                      Sources
                    </a>
                    <a href="/newsletters" className="text-gray-700 hover:text-inovintell-blue px-3 py-2 rounded-md text-sm font-medium">
                      Newsletters
                    </a>
                  </nav>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                © 2025 InovIntell - Newsletter Generation Tool
              </p>
            </div>
          </footer>
        </div>
        <ToastContainer />
      </body>
    </html>
  )
}