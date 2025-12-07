'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'

export default function ConnectionStatus() {
  const { user, loading } = useAuth()
  const [cookies, setCookies] = useState({})

  useEffect(() => {
    // Récupérer tous les cookies liés à l'authentification
    const authCookies = {
      token: Cookies.get('token') ? 'Présent' : 'Absent',
      user_id: Cookies.get('user_id') || 'Non défini',
      user_name: Cookies.get('user_name') || 'Non défini',
      user_email: Cookies.get('user_email') || 'Non défini',
      last_activity: Cookies.get('last_activity') ? new Date(parseInt(Cookies.get('last_activity'))).toLocaleString() : 'Non défini'
    }
    setCookies(authCookies)
  }, [user])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="text-sm font-bold mb-2">État de connexion</h3>
      <div className="text-xs space-y-1">
        <div>Utilisateur: {user ? user.name : 'Non connecté'}</div>
        <div>Loading: {loading ? 'Oui' : 'Non'}</div>
        <div>Token: {cookies.token}</div>
        <div>User ID: {cookies.user_id}</div>
        <div>Nom: {cookies.user_name}</div>
        <div>Email: {cookies.user_email}</div>
        <div>Dernière activité: {cookies.last_activity}</div>
      </div>
    </div>
  )
} 