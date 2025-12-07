'use client'

import './globals.css'
import './style.css'

import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { NotificationBadgeProvider } from '@/contexts/NotificationBadgeContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { GlobalProvider } from "@/contexts/GlobalState";
import { Toaster } from 'react-hot-toast'
import SocketDiagnostic from '@/components/SocketDiagnostic'
// import ConnectionStatus from '@/components/ConnectionStatus'
import { usePathname } from 'next/navigation'
import { useActivityTracker } from '@/hooks/useActivityTracker'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const pathname = usePathname()
  
  // Tracker l'activité utilisateur
  useActivityTracker()
  
  // Pages d'authentification où on ne veut pas la navbar
  const isAuthPage = pathname?.startsWith('/auth/')
  
  // Pages qui gèrent leur propre layout pleine largeur (sans container)
  const fullWidthPages = ['/', '/api', '/game']
  const isFullWidthPage = fullWidthPages.includes(pathname)
  
  // Afficher le diagnostic seulement en développement
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <GlobalProvider>
            <SocketProvider>
              <NotificationBadgeProvider>
                {isAuthPage ? (
                  // Layout pour les pages d'authentification (sans navbar, sans container)
                  <>
                    {children}
                    <Toaster 
                      position="bottom-right"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#363636',
                          color: '#fff',
                        },
                      }}
                    />
                    {/* <CookieConsent /> */}
                    {isDevelopment && <SocketDiagnostic />}
                    {/* {isDevelopment && <ConnectionStatus />} */}
                  </>
                ) : isFullWidthPage ? (
                  // Layout pour les pages pleine largeur (avec navbar mais sans container)
                  <div className="min-auto bg-gray-50 dark:bg-gray-400">
                    {/* <Navbar /> */}
                      {children}
                    <Toaster 
                      position="bottom-right"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#363636',
                          color: '#fff',
                        },
                      }}
                    />
                    {/* <CookieConsent /> */}
                    {isDevelopment && <SocketDiagnostic />}
                    {/* {isDevelopment && <ConnectionStatus />} */}
                  </div>
                ) : (
                  // Layout normal pour les autres pages
                  <div className="min-auto bg-gray-50 dark:bg-gray-400">
                    {/* <Navbar /> */}
                      {children}
                      <Toaster 
                      position="bottom-right"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#363636',
                          color: '#fff',
                        },
                      }}
                    />
                    {/* <CookieConsent /> */}
                    {isDevelopment && <SocketDiagnostic />}
                    {/* {isDevelopment && <ConnectionStatus />} */}
                  </div>
                )}
              </NotificationBadgeProvider>
            </SocketProvider>
            </GlobalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 