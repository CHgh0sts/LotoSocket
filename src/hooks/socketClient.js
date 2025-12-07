'use client'

import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'

export function useSocketClient(url) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const [error, setError] = useState(null)

  const connect = useCallback(() => {
    try {
      // Utiliser l'origine de la page actuelle pour fonctionner sur tous les appareils
      const socketUrl = url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      console.log('🔌 Tentative de connexion Socket.IO vers:', socketUrl)
      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })
      
      socketInstance.on('connect', () => {
        console.log('🔌 Socket connecté:', socketInstance.id)
        setIsConnected(true)
        setError(null)
      })

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('🔌 Socket reconnecté après', attemptNumber, 'tentatives')
        setIsConnected(true)
        setError(null)
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket déconnecté:', reason)
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error) => {
        setError(error)
      })

      socketInstance.on('error', (error) => {
        setError(error)
      })

      // Écouter tous les messages pour le débogage
      socketInstance.onAny((eventName, ...args) => {
        setLastMessage({ event: eventName, data: args, timestamp: new Date().toISOString() })
      })

      socketInstance.connect()
      setSocket(socketInstance)
    } catch (err) {
      setError(err)
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Déconnexion manuelle du socket')
      socket.disconnect()
      setSocket(null)
    }
  }, [socket])

  const sendMessage = useCallback((event, message) => {
    if (socket && isConnected) {
      socket.emit(event, message)
    } else {
      console.warn('⚠️ Impossible d\'envoyer le message: Socket non connecté')
    }
  }, [socket, isConnected])

  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, (data) => {
        callback(data)
      })
    } else {
      console.warn(`⚠️ Impossible d'ajouter l'écouteur ${event}: Socket non disponible`)
    }
  }, [socket])

  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback)
    }
  }, [socket])

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [socket])

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    on,
    off
  }
}


