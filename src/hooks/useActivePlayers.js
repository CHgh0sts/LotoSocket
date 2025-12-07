import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

export const useActivePlayers = () => {
  const [activePlayers, setActivePlayers] = useState({})
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedRooms, setSubscribedRooms] = useState(new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  // Fonction pour récupérer les valeurs initiales depuis l'API
  const fetchInitialActivePlayers = async () => {
    try {
      const response = await fetch('/api/game/public-rooms')
      const data = await response.json()
      
      if (response.ok && data.success) {
        const initialValues = {}
        data.rooms.forEach(room => {
          initialValues[room.code] = room.activePlayerCount || 0
        })
        setActivePlayers(initialValues)
        console.log('📊 Valeurs initiales récupérées:', initialValues)
      }
    } catch (error) {
      console.log('Erreur lors de la récupération des valeurs initiales:', error)
    }
  }

  useEffect(() => {
    // Récupérer les valeurs initiales
    fetchInitialActivePlayers()
    
    // Créer la connexion WebSocket
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    })

    setSocket(newSocket)

    // Événements de connexion
    newSocket.on('connect', () => {
      console.log('WebSocket connecté pour les joueurs actifs')
      setIsConnected(true)
      setIsInitialized(true)
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket déconnecté')
      setIsConnected(false)
    })

    // Écouter les mises à jour des joueurs actifs
    newSocket.on('active_players_updated', (data) => {
      console.log('Mise à jour des joueurs actifs:', data)
      setActivePlayers(prev => ({
        ...prev,
        [data.roomCode]: data.activeCount
      }))
    })

    // Écouter les événements de joueur qui rejoint
    newSocket.on('player_joined', (data) => {
      console.log('Joueur rejoint:', data)
      if (data.roomCode) {
        setActivePlayers(prev => ({
          ...prev,
          [data.roomCode]: data.totalPlayers
        }))
      }
    })

    // Écouter les événements de joueur qui quitte
    newSocket.on('player_left', (data) => {
      console.log('Joueur quitté:', data)
      if (data.roomCode) {
        setActivePlayers(prev => ({
          ...prev,
          [data.roomCode]: data.totalPlayers
        }))
      }
    })

    // Nettoyer à la déconnexion
    return () => {
      newSocket.close()
    }
  }, [])

  // Fonction pour demander une mise à jour des joueurs actifs
  const requestActivePlayersUpdate = (roomCode) => {
    if (socket && isConnected) {
      socket.emit('request_active_players', { roomCode })
    }
  }

  // Fonction pour s'abonner aux mises à jour d'une room
  const subscribeToRoom = (roomCode) => {
    if (socket && isConnected && !subscribedRooms.has(roomCode)) {
      socket.emit('subscribe_to_active_players', { roomCode })
      setSubscribedRooms(prev => new Set([...prev, roomCode]))
      console.log(`Abonné aux mises à jour pour la room ${roomCode}`)
    }
  }

  // Fonction pour s'abonner à plusieurs rooms
  const subscribeToRooms = (roomCodes) => {
    roomCodes.forEach(roomCode => {
      subscribeToRoom(roomCode)
    })
  }

  // Fonction pour obtenir le nombre de joueurs actifs d'une room
  const getActivePlayersCount = (roomCode) => {
    return activePlayers[roomCode] || 0
  }

  return {
    activePlayers,
    isConnected,
    isInitialized,
    requestActivePlayersUpdate,
    subscribeToRoom,
    subscribeToRooms,
    getActivePlayersCount,
    fetchInitialActivePlayers
  }
} 