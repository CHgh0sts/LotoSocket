'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { useTheme } from './ThemeContext'

const AuthContext = createContext()

const testUser = {
  id: 'test-user-123',
  name: 'CHghosts',
  email: 'test@example.com',
  theme: 'system'
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('token')
      const userId = Cookies.get('user_id')
      const userName = Cookies.get('user_name')
      const userEmail = Cookies.get('user_email')
      
      if (!token || !userId) {
        // Pas de redirection automatique, juste marquer comme non connecté
        setUser(null)
        setLoading(false)
        return
      }

      // Vérifier l'activité récente
      const lastActivity = Cookies.get('last_activity')
      const now = Date.now()
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
      
      if (lastActivity && parseInt(lastActivity) < thirtyDaysAgo) {
        // Session expirée
        logout()
        setLoading(false)
        return
      }

      // Mettre à jour l'activité
      Cookies.set('last_activity', now.toString(), { 
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        
        // Synchroniser le thème utilisateur avec le contexte
        if (userData.theme && userData.theme !== 'system') {
          localStorage.setItem('theme', userData.theme)
        }
      } else {
        // Token invalide, nettoyer les cookies
        logout()
      }
    } catch (error) {
      console.log('Erreur lors de la vérification de l\'authentification:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Cookies de session
        Cookies.set('token', data.token, { 
          expires: 30, // 30 jours
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        // Cookie pour l'utilisateur connecté
        Cookies.set('user_id', data.user.id, { 
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        // Cookie pour le nom d'utilisateur
        Cookies.set('user_name', data.user.name, { 
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        // Cookie pour l'email
        Cookies.set('user_email', data.user.email, { 
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        setUser(data.user)
        toast.success('Connexion réussie !')
        return { success: true }
      } else {
        toast.error(data.error || 'Erreur de connexion')
        return { success: false, error: data.error }
      }
    } catch (error) {
      toast.error('Erreur de connexion')
      return { success: false, error: 'Erreur de connexion' }
    }
  }

  const register = async (name, email, password) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // L'inscription a réussi, mais l'utilisateur doit vérifier son email
        // On ne définit pas de token car le compte n'est pas encore vérifié
        
        if (data.emailSent) {
          toast.success('Inscription réussie ! Vérifiez votre email pour activer votre compte.')
        } else {
          toast.success(data.message, { duration: 5000 })
          if (data.warning) {
            toast.error(data.supportMessage, { duration: 6000 })
          }
        }
        
        return { 
          success: true, 
          emailSent: data.emailSent,
          message: data.message,
          userId: data.userId
        }
      } else {
        toast.error(data.error || 'Erreur d\'inscription')
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.log('Erreur lors de l\'inscription:', error)
      toast.error('Erreur d\'inscription')
      return { success: false, error: 'Erreur d\'inscription' }
    }
  }

  const logout = () => {
    // Supprimer tous les cookies de session
    Cookies.remove('token')
    Cookies.remove('user_id')
    Cookies.remove('user_name')
    Cookies.remove('user_email')
    Cookies.remove('last_activity')
    
    setUser(null)
    toast.success('Déconnexion réussie')
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 