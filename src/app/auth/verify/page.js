'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailContent() {
  const [status, setStatus] = useState('loading') // 'loading', 'success', 'error'
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de vérification manquant')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (token) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Email vérifié avec succès !')
      } else {
        setStatus('error')
        setMessage(data.error || 'Erreur lors de la vérification')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erreur lors de la vérification')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {/* Verification Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Vérification de l&apos;email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {status === 'loading' && 'Vérification en cours...'}
              {status === 'success' && 'Votre compte a été activé'}
              {status === 'error' && 'Erreur lors de la vérification'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {message && (
              <Alert className={getStatusColor()}>
                <AlertDescription className={
                  status === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : status === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
                }>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {status === 'success' && (
                <Button 
                  asChild
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Link href="/auth/login">
                    Se connecter
                  </Link>
                </Button>
              )}

              {status === 'error' && (
                <div className="space-y-3">
                  <Button 
                    asChild
                    variant="outline"
                    className="w-full h-12 text-lg font-medium"
                  >
                    <Link href="/auth/register">
                      Créer un nouveau compte
                    </Link>
                  </Button>
                  <Button 
                    asChild
                    className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Link href="/auth/login">
                      Se connecter
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Chargement...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
