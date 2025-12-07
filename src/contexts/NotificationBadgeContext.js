'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import Cookies from 'js-cookie'

const NotificationBadgeContext = createContext()

export function NotificationBadgeProvider({ children }) {
  const { user } = useAuth()
  const [badges, setBadges] = useState({
    notifications: 0,
    invitations: 0,
    friends: 0
  })
  const [loading, setLoading] = useState(true)

  const getAuthHeaders = () => {
    const token = Cookies.get('token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const fetchBadges = async () => {
    if (!user) {
      setBadges({ notifications: 0, invitations: 0, friends: 0 })
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Récupérer les notifications non lues
      const notificationsPromise = fetch('/api/notifications?unread=true&limit=1', {
        headers: getAuthHeaders()
      })
      
      // Récupérer les invitations en attente
      const invitationsPromise = fetch('/api/invitations?status=pending', {
        headers: getAuthHeaders()
      })

      // Récupérer les demandes d'amis en attente
      const friendsPromise = fetch('/api/friends', {
        headers: getAuthHeaders()
      })

      // Exécuter toutes les requêtes en parallèle avec gestion d'erreur
      const [notificationsResponse, invitationsResponse, friendsResponse] = await Promise.allSettled([
        notificationsPromise,
        invitationsPromise,
        friendsPromise
      ])

      let notificationCount = 0
      let invitationCount = 0
      let friendRequestCount = 0

      // Gestion des notifications
      if (notificationsResponse.status === 'fulfilled' && notificationsResponse.value.ok) {
        try {
          const notificationsData = await notificationsResponse.value.json()
          notificationCount = notificationsData.unreadCount || 0
        } catch (e) {
          console.warn('Erreur parsing notifications:', e)
        }
      }

      // Gestion des invitations
      if (invitationsResponse.status === 'fulfilled' && invitationsResponse.value.ok) {
        try {
          const invitationsData = await invitationsResponse.value.json()
          invitationCount = Array.isArray(invitationsData) ? invitationsData.length : 0
        } catch (e) {
          console.warn('Erreur parsing invitations:', e)
        }
      }

      // Gestion des demandes d'amis
      if (friendsResponse.status === 'fulfilled' && friendsResponse.value.ok) {
        try {
          const friendsData = await friendsResponse.value.json()
          friendRequestCount = (friendsData.receivedRequests || []).length
        } catch (e) {
          console.warn('Erreur parsing amis:', e)
        }
      }

      setBadges({
        notifications: notificationCount,
        invitations: invitationCount,
        friends: friendRequestCount
      })

    } catch (error) {
      console.log('Erreur lors de la récupération des badges:', error)
      setBadges({ notifications: 0, invitations: 0, friends: 0 })
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour mettre à jour les badges manuellement
  const decrementNotifications = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      notifications: Math.max(0, prev.notifications - count)
    }))
  }

  const decrementInvitations = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      invitations: Math.max(0, prev.invitations - count)
    }))
  }

  const decrementFriends = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      friends: Math.max(0, prev.friends - count)
    }))
  }

  const incrementNotifications = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      notifications: prev.notifications + count
    }))
  }

  const incrementInvitations = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      invitations: prev.invitations + count
    }))
  }

  const incrementFriends = (count = 1) => {
    setBadges(prev => ({
      ...prev,
      friends: prev.friends + count
    }))
  }

  const resetNotifications = () => {
    setBadges(prev => ({ ...prev, notifications: 0 }))
  }

  const resetInvitations = () => {
    setBadges(prev => ({ ...prev, invitations: 0 }))
  }

  const resetFriends = () => {
    setBadges(prev => ({ ...prev, friends: 0 }))
  }

  const refreshBadges = () => {
    fetchBadges()
  }

  const formatBadgeCount = (count) => {
    if (count === 0) return null
    if (count > 9) return '9+'
    return count.toString()
  }

  useEffect(() => {
    fetchBadges()
  }, [user])

  // Polling toutes les 60 secondes pour les mises à jour en temps réel
  useEffect(() => {
    if (!user) return

    const interval = setInterval(fetchBadges, 60000)
    return () => clearInterval(interval)
  }, [user])

  // Écouter les événements Socket.IO pour les mises à jour automatiques
  useEffect(() => {
    const handleInvitationReceived = () => {
      incrementInvitations(1)
    }

    const handleNotificationReceived = () => {
      incrementNotifications(1)
    }

    const handleCollaboratorAdded = () => {
      // Actualiser les données si nécessaire
      fetchBadges()
    }

    // Ajouter les listeners
    window.addEventListener('invitation_received', handleInvitationReceived)
    window.addEventListener('notification_received', handleNotificationReceived)
    window.addEventListener('collaborator_added', handleCollaboratorAdded)

    return () => {
      // Nettoyer les listeners
      window.removeEventListener('invitation_received', handleInvitationReceived)
      window.removeEventListener('notification_received', handleNotificationReceived)
      window.removeEventListener('collaborator_added', handleCollaboratorAdded)
    }
  }, [incrementInvitations, incrementNotifications])

  const value = {
    badges,
    loading,
    refreshBadges,
    formatBadgeCount,
    // Fonctions de décrémentation
    decrementNotifications,
    decrementInvitations,
    decrementFriends,
    // Fonctions d'incrémentation
    incrementNotifications,
    incrementInvitations,
    incrementFriends,
    // Fonctions de reset
    resetNotifications,
    resetInvitations,
    resetFriends
  }

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  )
}

export function useNotificationBadges() {
  const context = useContext(NotificationBadgeContext)
  if (!context) {
    throw new Error('useNotificationBadges must be used within a NotificationBadgeProvider')
  }
  return context
} 