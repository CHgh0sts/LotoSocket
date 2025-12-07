'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedRoute({ children, fallback = null }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!loading) {
      setAuthChecked(true)
      if (!user) {
        router.push('/auth/login')
      }
    }
  }, [user, loading, router])

  // Afficher un écran de chargement pendant la vérification
  if (loading || !authChecked) {
    return fallback || (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  // Si l'utilisateur est connecté, afficher le contenu
  return children
} 