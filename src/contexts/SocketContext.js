'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { useAuth } from './AuthContext'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (user) {
      const token = Cookies.get('token')
      
      if (token) {
        // Déterminer l'URL du serveur Socket.IO selon l'environnement
        const getSocketUrl = () => {
          if (typeof window !== 'undefined') {
            // En développement, utiliser le même port que le serveur
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              return `http://${window.location.hostname}:3000`
            }
            // En production, utiliser la même origine que la page
            return window.location.origin
          }
          // Fallback
          return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }

        const socketUrl = getSocketUrl()
        console.log('🔌 Connexion Socket.IO vers:', socketUrl)

        // Créer la connexion Socket.IO
        const newSocket = io(socketUrl, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          maxReconnectionAttempts: 5,
          withCredentials: true
        })

        // Événements de connexion
        newSocket.on('connect', () => {
          console.log('🔌 Connecté au serveur Socket.IO')
          setIsConnected(true)
        })

        newSocket.on('disconnect', (reason) => {
          console.log('❌ Déconnecté du serveur Socket.IO:', reason)
          setIsConnected(false)
        })

        newSocket.on('connect_error', (error) => {
          console.log('🚨 Erreur de connexion Socket.IO:', error.message)
          setIsConnected(false)
        })

        newSocket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Reconnecté au serveur Socket.IO (tentative', attemptNumber, ')')
          setIsConnected(true)
        })

        newSocket.on('reconnect_error', (error) => {
          console.log('🚨 Erreur de reconnexion Socket.IO:', error.message)
        })

        newSocket.on('reconnect_failed', () => {
          console.log('❌ Échec de reconnexion Socket.IO')
          toast.error('Connexion temps réel perdue. Veuillez rafraîchir la page.')
        })

        // Écouter les invitations reçues
        newSocket.on('invitation_received', (data) => {
          toast.success(`📨 Nouvelle invitation de ${data.senderName} pour le projet "${data.projectName}"`)
          
          // Déclencher un événement personnalisé pour mettre à jour les badges
          window.dispatchEvent(new CustomEvent('invitation_received', { detail: data }))
        })

        // Écouter les notifications générales
        newSocket.on('notification_received', (data) => {
          toast.success(`🔔 ${data.title}`)
          
          // Déclencher un événement pour mettre à jour les badges
          window.dispatchEvent(new CustomEvent('notification_received', { detail: data }))
        })

        // Écouter les mises à jour de projet
        newSocket.on('project_updated', (data) => {
          // Déclencher un événement pour mettre à jour l'interface
          window.dispatchEvent(new CustomEvent('project_updated', { detail: data }))
        })

        // Écouter les changements de todos
        newSocket.on('todo_created', (data) => {
          window.dispatchEvent(new CustomEvent('todo_created', { detail: data }))
        })

        newSocket.on('todo_updated', (data) => {
          window.dispatchEvent(new CustomEvent('todo_updated', { detail: data }))
        })

        newSocket.on('todo_deleted', (data) => {
          window.dispatchEvent(new CustomEvent('todo_deleted', { detail: data }))
        })

        // Écouter les changements de collaborateurs
        newSocket.on('collaborator_added', (data) => {
          toast.success(`👥 ${data.userName} a rejoint le projet "${data.projectName}"`)
          window.dispatchEvent(new CustomEvent('collaborator_added', { detail: data }))
        })

        newSocket.on('collaborator_removed', (data) => {
          window.dispatchEvent(new CustomEvent('collaborator_removed', { detail: data }))
        })

        setSocket(newSocket)

        return () => {
          console.log('🔌 Fermeture de la connexion Socket.IO')
          newSocket.close()
        }
      }
    } else {
      // Déconnecter si l'utilisateur n'est pas connecté
      if (socket) {
        console.log('🔌 Déconnexion Socket.IO (utilisateur non connecté)')
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [user])

  // Fonctions utilitaires
  const joinProject = (projectId) => {
    if (socket && isConnected) {
      socket.emit('join_project', projectId)
      console.log(`📋 Rejoindre le projet ${projectId}`)
    } else {
      console.warn('⚠️ Impossible de rejoindre le projet: Socket non connecté')
    }
  }

  const leaveProject = (projectId) => {
    if (socket && isConnected) {
      socket.emit('leave_project', projectId)
      console.log(`📋 Quitter le projet ${projectId}`)
    } else {
      console.warn('⚠️ Impossible de quitter le projet: Socket non connecté')
    }
  }

  const value = {
    socket,
    isConnected,
    joinProject,
    leaveProject
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 