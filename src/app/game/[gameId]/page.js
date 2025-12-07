'use client'
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocketClient } from '@/hooks/socketClient'
import { GlobalContext } from '@/contexts/GlobalState'
import { Loader2, Crown, Lock, LockOpen, CheckIcon, FolderOpen, BarChart3, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Cookies from 'js-cookie'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import Carton from '@/components/game/Carton'
import WinnerModal from '@/components/WinnerModal'
import { useWinnerDetection } from '@/hooks/useWinnerDetection'
import PlayersCartonsList from '@/components/PlayersCartonsList'
import RoomSettingsDialog from '@/components/RoomSettingsDialog'
import CategoriesModal from '@/components/CategoriesModal'
import StatsModal from '@/components/StatsModal'
import CartonCategoryModal from '@/components/CartonCategoryModal'

const GamePage = () => {
    const { gameId } = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [gameType, setGameType] = useState('1Ligne')
    const [typeGameLoading, setTypeGameLoading] = useState(false)
    const [gameNumber, setGameNumber] = useState(0)
    const [debugMessages, setDebugMessages] = useState([])
    const { socket, isConnected, connect, disconnect, on, off, lastMessage } = useSocketClient()
    const [tempGameSelected, setTempGameSelected] = useState(null)
    const { partyInfos, setPartyInfos } = useContext(GlobalContext)
    const [loadingGameInfo, setLoadingGameInfo] = useState(true)
    const [partyData, setPartyData] = useState(null)
    const [clearNumbers, setClearNumbers] = useState(false)
    const [showPlayersModal, setShowPlayersModal] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState('all')
    const [players, setPlayers] = useState([])
    const [cartons, setCartons] = useState([])
    const [showTempPlayerDialog, setShowTempPlayerDialog] = useState(false)
    const [tempPlayerName, setTempPlayerName] = useState('')
    const [isCreatingTempPlayer, setIsCreatingTempPlayer] = useState(false)
    const [hasBeenBanned, setHasBeenBanned] = useState(false)
    const [showBannedPlayers, setShowBannedPlayers] = useState(false)
    const [bannedPlayers, setBannedPlayers] = useState([])
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, playerId: null })
    const [showAddCartonModal, setShowAddCartonModal] = useState(false)
    const [cartonValidation, setCartonValidation] = useState({ isValid: false, errors: [], totalNumbers: 0 })
    const [isAddingCarton, setIsAddingCarton] = useState(false)
    const [addCartonTrigger, setAddCartonTrigger] = useState(false)
    const [cartonKey, setCartonKey] = useState(0)
    const [showRoomSettingsDialog, setShowRoomSettingsDialog] = useState(false)
    const [showCategoriesModal, setShowCategoriesModal] = useState(false)
    const [showStatsModal, setShowStatsModal] = useState(false)
    const [cartonContextMenu, setCartonContextMenu] = useState({ show: false, x: 0, y: 0, cartonId: null })
    const [showCartonCategoryModal, setShowCartonCategoryModal] = useState(false)
    const [selectedCartonForCategory, setSelectedCartonForCategory] = useState(null)
    const [categories, setCategories] = useState([])
    const [showMobileSidebar, setShowMobileSidebar] = useState(false)

    // Fonction pour filtrer les cartons des catégories désactivées
    const filterActiveCartons = useCallback((cartonsToFilter) => {
        if (!cartonsToFilter || cartonsToFilter.length === 0) return []
        
        // Créer un Map des catégories activées pour un accès rapide
        const activeCategoriesMap = new Map()
        categories.forEach(cat => {
            if (cat.activated) {
                activeCategoriesMap.set(cat.id, true)
            }
        })
        
        return cartonsToFilter.filter(carton => {
            // Si le carton n'a pas de catégorie, on le garde
            if (!carton.categoryId) {
                return true
            }
            // Si le carton a une catégorie, on le garde seulement si la catégorie est activée
            return activeCategoriesMap.has(carton.categoryId)
        })
    }, [categories])

    // Cartons filtrés (sans ceux des catégories désactivées)
    const activeCartons = useMemo(() => filterActiveCartons(cartons), [cartons, filterActiveCartons])

    // Hook pour la détection des gagnants (utilise seulement les cartons actifs)
    const { winners, showWinnerModal, closeWinnerModal, updatePlayerNames } = useWinnerDetection(
        activeCartons, 
        partyInfos.numbers || [], 
        gameType,
        players
    )

    // Fonction pour ajouter des messages de débogage
    const addDebugMessage = (message) => {
        setDebugMessages(prev => [...prev, { message, timestamp: new Date().toLocaleTimeString() }])
        console.log(`[DEBUG] ${message}`)
    }

    // Fonction pour gérer le bannissement
    const handleBan = () => {
        if (!hasBeenBanned) {
            setHasBeenBanned(true)
            addDebugMessage('Vous êtes banni de cette room')
            toast.error('Vous êtes banni de cette room')
            router.push('/')
        }
    }

    // Vérifier si l'utilisateur actuel est le créateur de la room
    const isCreator = partyData?.creator?.id === user?.id

    // Charger les informations de la partie au démarrage
    useEffect(() => {
        const loadPartyData = async () => {
            try {
                const token = Cookies.get('token')
                if (!token) {
                    addDebugMessage('Erreur: Token d\'authentification manquant')
                    return
                }

                const response = await fetch(`/api/game/${gameId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                const data = await response.json()                

                if (response.ok && data.success) {
                    setPartyData(data.room)
                    const latestParty = data.room.Party[0]
                    setGameType(latestParty ? latestParty.gameType : '1Ligne')
                    setGameNumber(latestParty && latestParty.listNumbers.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0)
                    
                    // Mettre à jour le contexte global avec la dernière partie
                    const lastParty = data.room.Party[0] // La plus récente
                    if (lastParty) {
                        setPartyInfos(prev => ({
                            ...prev,
                            id: lastParty.id,
                            gameType: lastParty.gameType,
                            numbers: lastParty.listNumbers || [],
                            roomId: data.room.id,
                            creator: data.room.creator,
                            listUsers: data.room.players ? data.room.players.map(player => ({ id: player.id, username: player.name })) : []
                        }))
                    }
                    
                    addDebugMessage(`Room chargée: ${data.room.name} (Code: ${data.room.code})`)
                } else if (response.status === 403) {
                    // Utilisateur banni
                    handleBan()
                } else {
                    addDebugMessage(`Erreur lors du chargement de la room: ${data.error}`)
                }
            } catch (error) {
                addDebugMessage(`Erreur lors du chargement de la partie: ${error.message}`)
            } finally {
                setLoadingGameInfo(false)
            }
        }

        if (gameId) {
            loadPartyData()
        }
    }, [gameId, setPartyInfos])

    useEffect(() => {
        // Connecter automatiquement au socket
        if (!isConnected) {
            addDebugMessage('Tentative de connexion au socket...')
            connect()
        }
    }, [connect, isConnected])

    useEffect(() => {
        if (socket && isConnected && user?.id) {
            addDebugMessage(`Connexion établie, rejoindre le jeu ${gameId}`)
            
            // Rejoindre le jeu
            socket.emit('join_game', { gameId: gameId, userId: user.id })
            setGameType(partyInfos.gameType)

            // Écouter les événements du jeu
            on('game_joined', (data) => {
                console.log('data', data);

                addDebugMessage(`Jeu rejoint avec succès: ${JSON.stringify(data)}`)
                if (data.success && data.game) {
                    setGameType(data.game.gameType)
                    setGameNumber(data.game.currentNumber)
                    
                    setPartyInfos(prev => ({ 
                        ...prev, 
                        gameType: data.game.gameType, 
                        numbers: data.game.numbers, 
                        gameId: data.game.id,
                        listUsers: data.game.listUsers
                    }))
                } else if (data.error && data.error.includes('banni')) {
                    handleBan()
                    return
                }
                setLoadingGameInfo(false)
            })

            on('game_type_changed', (data) => {
                addDebugMessage(`Type de jeu changé: ${JSON.stringify(data)}`)
                setTypeGameLoading(false)
                setTempGameSelected(null) // Réinitialiser la sélection temporaire
                setGameType(data.gameType)
            })

            on('game_type_change_confirmed', (data) => {
                addDebugMessage(`Changement de type confirmé: ${JSON.stringify(data)}`)
                setTypeGameLoading(false)
                setTempGameSelected(null) // Réinitialiser la sélection temporaire
            })

            on('game_number_changed', (data) => {
                addDebugMessage(`Numéro de jeu changé: ${JSON.stringify(data)}`)
                setGameNumber(data.gameNumber)
            })

            on('numberToggled', (data) => {
                addDebugMessage(`Numéro togglé: ${JSON.stringify(data)}`)
                setGameNumber(data.allNumbers.length > 0 ? data.allNumbers[data.allNumbers.length - 1] : 0)
                setPartyInfos(prev => ({ 
                    ...prev, 
                    numbers: data.allNumbers
                }))
            })

            on('newParty', (data) => {
                addDebugMessage(`Nouvelle partie créée: ${JSON.stringify(data)}`)
                setPartyInfos(prev => ({ 
                    ...prev, 
                    gameType: data.party.gameType,
                    numbers: data.party.listNumbers
                }))
            })

            on('end_party_error', (data) => {
                addDebugMessage(`Erreur lors de la fin de partie: ${JSON.stringify(data)}`)
            })

            on('players_updated', (data) => {
                addDebugMessage(`Mise à jour des joueurs: ${data.count} joueurs`)
                setPartyInfos(prev => ({
                    ...prev,
                    listUsers: data.players || []
                }))
                
                // Mettre à jour aussi la liste des joueurs dans le modal si il est ouvert
                if (showPlayersModal) {
                    setPlayers(prevPlayers => {
                        return prevPlayers.map(player => ({
                            ...player,
                            isConnected: data.players?.some(connectedUser => connectedUser.id === player.id) || false
                        }))
                    })
                }
            })

            on('player_banned', (data) => {
                addDebugMessage(`Joueur banni: ${data.playerId}`)
                addDebugMessage(`User ID actuel: ${user?.id}`)
                // Si c'est l'utilisateur actuel qui est banni
                if (data.playerId === user?.id || data.playerId === user?.id?.toString()) {
                    addDebugMessage('Utilisateur actuel banni - redirection...')
                    handleBan()
                } else {
                    addDebugMessage('Autre joueur banni - mise à jour liste...')
                    // Sinon, mettre à jour la liste des joueurs
                    if (showPlayersModal) {
                        handlePlayersList()
                    }
                }
            })

            on('player_joined', (data) => {
                addDebugMessage(`Nouveau joueur rejoint: ${data.playerName} (${data.playerId})`)
                toast.success(`${data.playerName} a rejoint la partie`)
                // Mettre à jour la liste des joueurs si la modal est ouverte
                if (showPlayersModal) {
                    // Ajouter le nouveau joueur à la liste existante
                    setPlayers(prevPlayers => {
                        const newPlayer = {
                            id: data.playerId,
                            name: data.playerName,
                            isConnected: true,
                            tempCreateRoom: data.tempCreateRoom || false,
                            isCreator: data.isCreator || false
                        }
                        // Vérifier si le joueur n'existe pas déjà
                        if (!prevPlayers.find(p => p.id === data.playerId)) {
                            return [...prevPlayers, newPlayer]
                        }
                        return prevPlayers
                    })
                }
            })

            on('player_left', (data) => {
                addDebugMessage(`Joueur quitté: ${data.playerName} (${data.playerId})`)
                toast(`${data.playerName} a quitté la partie`, {
                    icon: '👋',
                    style: {
                        background: '#3B82F6',
                        color: 'white'
                    }
                })
                // Mettre à jour la liste des joueurs si la modal est ouverte
                if (showPlayersModal) {
                    // Retirer le joueur de la liste existante
                    setPlayers(prevPlayers => {
                        return prevPlayers.filter(player => player.id !== data.playerId)
                    })
                }
            })

            on('creator_transferred', (data) => {
                addDebugMessage(`Créateur transféré vers: ${data.newCreatorName} (${data.newCreatorId})`)
                toast.success(`Le rôle de créateur a été transféré à ${data.newCreatorName}`)
                
                // Recharger les données de la room pour tous les joueurs
                const loadPartyData = async () => {
                    try {
                        const token = Cookies.get('token')
                        if (!token) {
                            addDebugMessage('Erreur: Token d\'authentification manquant')
                            return
                        }

                        const response = await fetch(`/api/game/${gameId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })

                        const data = await response.json()                

                        if (response.ok && data.success) {
                            setPartyData(data.room)
                            const latestParty = data.room.Party[0]
                            setGameType(latestParty ? latestParty.gameType : '1Ligne')
                            setGameNumber(latestParty && latestParty.listNumbers.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0)
                            
                            // Mettre à jour le contexte global avec la dernière partie
                            const lastParty = data.room.Party[0] // La plus récente
                            if (lastParty) {
                                setPartyInfos(prev => ({
                                    ...prev,
                                    id: lastParty.id,
                                    gameType: lastParty.gameType,
                                    numbers: lastParty.listNumbers || [],
                                    roomId: data.room.id,
                                    creator: data.room.creator,
                                    listUsers: data.room.players ? data.room.players.map(player => ({ id: player.id, username: player.name })) : []
                                }))
                            }
                            
                            addDebugMessage(`Room mise à jour: ${data.room.name} (Code: ${data.room.code})`)
                        } else if (response.status === 403) {
                            // Utilisateur banni
                            handleBan()
                        } else {
                            addDebugMessage(`Erreur lors du chargement de la room: ${data.error}`)
                        }
                    } catch (error) {
                        addDebugMessage(`Erreur lors du chargement de la room: ${error.message}`)
                    }
                }
                loadPartyData()
                
                // Recharger la liste des joueurs si la modal est ouverte
                if (showPlayersModal) {
                    handlePlayersList()
                }
            })

            // Nettoyage des listeners
            return () => {
                addDebugMessage('Nettoyage des écouteurs d\'événements')
                off('game_joined')
                off('game_type_changed')
                off('game_type_change_confirmed')
                off('game_number_changed')
                off('numberToggled')
                off('newParty')
                off('end_party_error')
                off('players_updated')
                off('player_banned')
                off('player_joined')
                off('player_left')
            }
        }
    }, [socket, isConnected, gameId, partyInfos.gameType, user?.id, on, off])

    // Écouter tous les messages pour le débogage
    useEffect(() => {
        if (lastMessage) {
            addDebugMessage(`Événement reçu: ${lastMessage.event} - ${JSON.stringify(lastMessage.data)}`)
        }
    }, [lastMessage])

    useEffect(() => {
        console.log('GameId:', gameId)
        addDebugMessage(`Page de jeu chargée pour: ${gameId}`)
        
        // Charger automatiquement les données des joueurs, cartons et catégories
        const loadInitialData = async () => {
            try {
                const token = Cookies.get('token')
                if (!token) return

                // Charger les joueurs et cartons
                const playersResponse = await fetch(`/api/game/${gameId}/players`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                const playersData = await playersResponse.json()

                if (playersResponse.ok && playersData.success) {
                    const playersWithStatus = playersData.players.map(player => ({
                        ...player,
                        isConnected: partyInfos.listUsers?.some(connectedUser => connectedUser.id === player.id) || false
                    }))
                    
                    setPlayers(playersWithStatus || [])
                    setCartons(playersData.cartons || [])
                    updatePlayerNames(playersWithStatus)
                }

                // Charger les catégories
                const categoriesResponse = await fetch(`/api/game/${gameId}/categories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                const categoriesData = await categoriesResponse.json()

                if (categoriesResponse.ok && categoriesData.success) {
                    setCategories(categoriesData.categories || [])
                }
            } catch (error) {
                console.log('Erreur lors du chargement initial des données:', error)
            }
        }

        loadInitialData()
    }, [gameId])

    const handleGameType = (type) => {
        if (socket && isConnected) {
            setTempGameSelected(type) // Définir le type temporairement sélectionné
            addDebugMessage(`Tentative de changement de type vers: ${type}`)
            setTypeGameLoading(true)
            socket.emit('change_game_type', { gameId: gameId, gameType: type })
        } else {
            addDebugMessage('ERREUR: Socket non connecté pour changer le type de jeu')
            console.warn('Socket non connecté')
        }
    }

    const clearDebugMessages = () => {
        setDebugMessages([])
    }

    const handleNumberClick = (number) => {
        console.log('number', number)
        if (socket && isConnected) {
            socket.emit('add_number_to_carton', { gameId: gameId, number: number })
        } else {
            addDebugMessage('ERREUR: Socket non connecté pour ajouter un numéro au carton')
            console.warn('Socket non connecté')
        }
    }

    // Fonction pour déterminer l'état visuel d'un bouton
    const getButtonState = (buttonType) => {
        const isSelected = gameType === buttonType
        const isTempSelected = tempGameSelected === buttonType
        const isLoading = typeGameLoading && isTempSelected

        return {
            isSelected,
            isTempSelected,
            isLoading,
            isDisabled: !isConnected || (typeGameLoading && !isTempSelected)
        }
    }

    const handleEndParty = () => {
        if (socket && isConnected) {
            socket.emit('end_party', { gameId: gameId, typeGame: gameType, clearNumbers: clearNumbers })
        } else {
            addDebugMessage('ERREUR: Socket non connecté pour terminer la partie')
            console.warn('Socket non connecté')
        }
    }

    const handlePlayersList = async () => {
        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                // Ajouter le statut de connexion basé sur partyInfos.listUsers
                const playersWithStatus = data.players.map(player => ({
                    ...player,
                    isConnected: partyInfos.listUsers?.some(connectedUser => connectedUser.id === player.id) || false
                }))
                
                setPlayers(playersWithStatus || [])
                setCartons(data.cartons || [])
                // Mettre à jour les noms des joueurs pour la détection des gagnants
                updatePlayerNames(playersWithStatus)
                setShowPlayersModal(true)
            } else {
                addDebugMessage(`Erreur lors du chargement des joueurs: ${data.error}`)
            }
        } catch (error) {
            addDebugMessage(`Erreur lors du chargement des joueurs: ${error.message}`)
        }
    }

    // Mettre à jour le statut de connexion des joueurs quand partyInfos.listUsers change
    useEffect(() => {
        if (showPlayersModal && players.length > 0) {
            setPlayers(prevPlayers => {
                return prevPlayers.map(player => ({
                    ...player,
                    isConnected: partyInfos.listUsers?.some(connectedUser => connectedUser.id === player.id) || false
                }))
            })
        }
    }, [partyInfos.listUsers, showPlayersModal])

    const handleCreateTempPlayer = async () => {
        if (!isCreator) {
            toast.error('Seul le créateur peut créer des joueurs temporaires')
            return
        }

        if (!tempPlayerName.trim()) {
            toast.error('Le nom ne peut pas être vide')
            return
        }

        setIsCreatingTempPlayer(true)
        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/temp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: tempPlayerName.trim() })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success(`Profil temporaire créé: ${tempPlayerName.trim()}`)
                setTempPlayerName('')
                setShowTempPlayerDialog(false)
                // Recharger la liste des joueurs
                handlePlayersList()
            } else {
                toast.error(`Erreur lors de la création du profil temporaire: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors de la création du profil temporaire: ${error.message}`)
        } finally {
            setIsCreatingTempPlayer(false)
        }
    }

    const handleDeleteTempPlayer = async (playerId) => {
        if (!isCreator) {
            toast.error('Seul le créateur peut supprimer des joueurs')
            return
        }

        if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur temporaire ?')) {
            return
        }

        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/temp/${playerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('Joueur temporaire supprimé')
                // Recharger la liste des joueurs
                handlePlayersList()
                // Retourner à "All" si le joueur supprimé était sélectionné
                if (selectedPlayer === playerId) {
                    setSelectedPlayer('all')
                }
            } else {
                toast.error(`Erreur lors de la suppression: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors de la suppression: ${error.message}`)
        }
    }

    // Fonctions pour gérer l'ajout de carton
    const handleAddCartonClick = () => {
        if (selectedPlayer === 'all') {
            toast.error('Veuillez sélectionner un joueur spécifique pour ajouter un carton')
            return
        }

        // Vérifier les permissions
        const isAddingToSelf = selectedPlayer === user?.id
        if (!isCreator && !isAddingToSelf) {
            toast.error('Vous ne pouvez ajouter des cartons qu\'à vous-même')
            return
        }

        // Réinitialiser l'état de validation et forcer le re-render du composant Carton
        setCartonValidation({ isValid: false, errors: [], totalNumbers: 0 })
        setAddCartonTrigger(false)
        setCartonKey(prev => prev + 1) // Nouvelle clé pour créer un nouveau composant Carton
        setShowAddCartonModal(true)
    }

    const handleAddCarton = async (cartonNumbers) => {
        if (!selectedPlayer || selectedPlayer === 'all') {
            toast.error('Aucun joueur sélectionné')
            return
        }

        // Empêcher les soumissions multiples
        if (isAddingCarton) {
            return
        }

        setIsAddingCarton(true)
        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                setIsAddingCarton(false)
                return
            }

            const response = await fetch(`/api/game/${gameId}/carton`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerId: selectedPlayer,
                    listNumbers: cartonNumbers
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('Carton ajouté avec succès')
                setShowAddCartonModal(false)
                // Recharger la liste des joueurs et cartons
                handlePlayersList()
            } else {
                toast.error(`Erreur lors de l'ajout du carton: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors de l'ajout du carton: ${error.message}`)
        } finally {
            setIsAddingCarton(false)
        }
    }

    const handleCartonValidationError = (errors) => {
        toast.error(`Carton invalide: ${errors[0]}`)
    }

    const handleCartonValidationChange = useCallback((validation) => {
        setCartonValidation(validation)
    }, [])

    // Fonction pour ouvrir le dialog des paramètres
    const handleRoomSettingsClick = () => {
        // Vérifier que l'utilisateur est le créateur
        if (user?.id !== partyInfos.creator?.id) {
            toast.error('Seul le créateur peut modifier les paramètres de la partie')
            return
        }
        setShowRoomSettingsDialog(true)
    }

    // Fonction pour mettre à jour les données de la room après modification
    const handleRoomUpdate = (updatedRoomData) => {
        // Mettre à jour partyData avec les nouvelles données (utiliser isPublic car c'est ce qu'utilise partyData)
        setPartyData(prev => ({
            ...prev,
            isPublic: !updatedRoomData.room.isPrivate // Inverser car l'API renvoie isPrivate mais partyData utilise isPublic
        }))
        
        // Émettre la mise à jour via socket pour informer les autres joueurs
        if (socket) {
            socket.emit('roomSettingsChanged', {
                gameId,
                isPublic: !updatedRoomData.room.isPrivate,
                hasPassword: updatedRoomData.room.hasPassword
            })
        }
    }

    // Fonction pour gérer les catégories
    const handleCategoriesClick = () => {
        setShowCategoriesModal(true)
    }

    // Fonction pour gérer les stats
    const handleStatsClick = () => {
        setShowStatsModal(true)
    }

    // Fonction pour quitter la partie
    const handleLeaveGame = () => {
        if (confirm('Êtes-vous sûr de vouloir quitter la partie ?')) {
            router.push('/')
        }
    }

    // Fonction pour gérer le clic droit sur un carton
    const handleCartonRightClick = (e, cartonId) => {
        e.preventDefault()
        setCartonContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            cartonId
        })
    }

    // Fonction pour éditer la catégorie d'un carton
    const handleEditCartonCategory = () => {
        const carton = cartons.find(c => c.id === cartonContextMenu.cartonId)
        if (carton) {
            setSelectedCartonForCategory(carton)
            setShowCartonCategoryModal(true)
            setCartonContextMenu({ show: false, x: 0, y: 0, cartonId: null })
        }
    }

    // Fonction pour mettre à jour un carton après modification de catégorie
    const handleCartonUpdate = (updatedCarton) => {
        setCartons(prev => prev.map(carton => 
            carton.id === updatedCarton.id ? updatedCarton : carton
        ))
    }

    const handleBanPlayer = async (playerId) => {
        if (!isCreator) {
            toast.error('Seul le créateur peut bannir des joueurs')
            return
        }

        // Empêcher l'auto-bannissement
        if (playerId === user?.id) {
            toast.error('Vous ne pouvez pas vous bannir vous-même')
            return
        }

        if (!confirm('Êtes-vous sûr de vouloir bannir ce joueur de la partie ?')) {
            return
        }

        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/ban/${playerId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('Joueur banni de la partie')
                
                // Émettre un événement socket pour déconnecter le joueur banni
                if (socket && isConnected) {
                    addDebugMessage(`Émission de l'événement ban_player pour ${playerId}`)
                    socket.emit('ban_player', { 
                        gameId: gameId, 
                        playerId: playerId 
                    })
                } else {
                    addDebugMessage('Socket non connecté pour émettre ban_player')
                }
                
                // Recharger la liste des joueurs
                handlePlayersList()
                // Retourner à "All" si le joueur banni était sélectionné
                if (selectedPlayer === playerId) {
                    setSelectedPlayer('all')
                }
            } else {
                toast.error(`Erreur lors du bannissement: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors du bannissement: ${error.message}`)
        }
    }

    const handleUnbanPlayer = async (playerId) => {
        if (!isCreator) {
            toast.error('Seul le créateur peut débannir des joueurs')
            return
        }

        if (!confirm('Êtes-vous sûr de vouloir débannir ce joueur ?')) {
            return
        }

        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/unban/${playerId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('Joueur débanni avec succès')
                // Recharger la liste des joueurs bannis
                loadBannedPlayers()
                // Recharger aussi la liste des joueurs normaux
                handlePlayersList()
            } else {
                toast.error(`Erreur lors du débannissement: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors du débannissement: ${error.message}`)
        }
    }

    const loadBannedPlayers = async () => {
        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/banned`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setBannedPlayers(data.bannedPlayers || [])
            } else {
                addDebugMessage(`Erreur lors du chargement des joueurs bannis: ${data.error}`)
            }
        } catch (error) {
            addDebugMessage(`Erreur lors du chargement des joueurs bannis: ${error.message}`)
        }
    }

    const handleTransferCreator = async (newCreatorId) => {
        try {
            const token = Cookies.get('token')
            if (!token) {
                addDebugMessage('Erreur: Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/game/${gameId}/players/transfer-creator`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newCreatorId })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success(data.message)
                
                // Émettre l'événement WebSocket pour notifier les autres joueurs
                if (socket && isConnected) {
                    socket.emit('creator_transferred', {
                        gameId,
                        newCreatorId: data.newCreator.id,
                        newCreatorName: data.newCreator.name
                    })
                }
                
                // Recharger les données de la room
                const loadPartyData = async () => {
                    try {
                        const token = Cookies.get('token')
                        if (!token) {
                            addDebugMessage('Erreur: Token d\'authentification manquant')
                            return
                        }

                        const response = await fetch(`/api/game/${gameId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })

                        const data = await response.json()                

                        if (response.ok && data.success) {
                            setPartyData(data.room)
                            const latestParty = data.room.Party[0]
                            setGameType(latestParty ? latestParty.gameType : '1Ligne')
                            setGameNumber(latestParty && latestParty.listNumbers.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0)
                            
                            // Mettre à jour le contexte global avec la dernière partie
                            const lastParty = data.room.Party[0] // La plus récente
                            if (lastParty) {
                                setPartyInfos(prev => ({
                                    ...prev,
                                    id: lastParty.id,
                                    gameType: lastParty.gameType,
                                    numbers: lastParty.listNumbers || [],
                                    roomId: data.room.id,
                                    creator: data.room.creator,
                                    listUsers: data.room.players ? data.room.players.map(player => ({ id: player.id, username: player.name })) : []
                                }))
                            }
                            
                            addDebugMessage(`Room mise à jour: ${data.room.name} (Code: ${data.room.code})`)
                        } else if (response.status === 403) {
                            // Utilisateur banni
                            handleBan()
                        } else {
                            addDebugMessage(`Erreur lors du chargement de la room: ${data.error}`)
                        }
                    } catch (error) {
                        addDebugMessage(`Erreur lors du chargement de la room: ${error.message}`)
                    }
                }
                loadPartyData()
                // Recharger la liste des joueurs
                handlePlayersList()
            } else {
                toast.error(`Erreur lors du transfert du rôle: ${data.error}`)
            }
        } catch (error) {
            toast.error(`Erreur lors du transfert du rôle: ${error.message}`)
        }
        // Fermer le menu contextuel
        setContextMenu({ show: false, x: 0, y: 0, playerId: null })
    }

    const getFilteredCartons = () => {
        // D'abord filtrer par catégorie activée
        const activeCartonsFiltered = filterActiveCartons(cartons)
        
        // Ensuite filtrer par joueur sélectionné
        if (selectedPlayer === 'all') {
            return activeCartonsFiltered
        }
        return activeCartonsFiltered.filter(carton => carton.userId === selectedPlayer)
    }

    // Gestionnaire pour ouvrir le menu contextuel
    const handleContextMenu = (e, playerId) => {
        e.preventDefault()
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            playerId
        })
    }

    // Gestionnaire pour fermer le menu contextuel
    const handleCloseContextMenu = () => {
        setContextMenu({ show: false, x: 0, y: 0, playerId: null })
    }

    // Fermer le menu contextuel quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.show) {
                setContextMenu({ show: false, x: 0, y: 0, playerId: null })
            }
            if (cartonContextMenu.show) {
                setCartonContextMenu({ show: false, x: 0, y: 0, cartonId: null })
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [contextMenu.show, cartonContextMenu.show])

    return (
        <ProtectedRoute>
            <div className='fixed top-0 left-0 w-full h-[6vh] bg-gray-800 z-50 border-b border-gray-700'>
                {/* En-tête de la partie */}
                <div className='flex items-center justify-between px-4 h-full'>
                    {/* Section gauche - Nom de la partie */}
                    <div className='text-white text-sm flex items-center'>
                        <button 
                            onClick={handleRoomSettingsClick}
                            className="hover:bg-gray-700 p-1 rounded transition-colors duration-200"
                            title="Paramètres de la partie"
                        >
                            {partyData?.isPublic ? <LockOpen className='w-4 h-4 text-white' /> : <Lock className='w-4 h-4 text-white' />}
                        </button>
                        <span className="ml-2 truncate max-w-[120px] md:max-w-none">{partyData?.name || ''}</span>
                    </div>

                    {/* Section droite - Boutons d'actions (cachés sur mobile) */}
                    <div className='hidden md:flex items-center gap-2'>
                        <button
                            onClick={handleCategoriesClick}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-200"
                            title="Gérer les catégories"
                        >
                            <FolderOpen className='w-4 h-4' />
                            Catégories
                        </button>
                        
                        <button
                            onClick={handleStatsClick}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors duration-200"
                            title="Voir les statistiques"
                        >
                            <BarChart3 className='w-4 h-4' />
                            Stats
                        </button>
                        
                        <button
                            onClick={handleLeaveGame}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors duration-200"
                            title="Quitter la partie"
                        >
                            <LogOut className='w-4 h-4' />
                            Quitter
                        </button>
                    </div>

                    {/* Bouton menu hamburger (visible sur mobile) */}
                    <button
                        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                        className="md:hidden p-2 text-white hover:bg-gray-700 rounded transition-colors"
                    >
                        {showMobileSidebar ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
                    </button>
                </div>
            </div>
            <div className='relative w-full mt-[6vh] h-[94vh] bg-gray-900'>
                <div className='relative top-0 left-0 w-full md:w-[calc(100%-35vh)] h-full bg-gray-900 border-b border-gray-700'>
                    {/* Classement des joueurs en bas à gauche (caché sur mobile) */}
                    <div className='hidden md:block'>
                        <PlayersCartonsList 
                            players={players}
                            cartons={activeCartons}
                            drawnNumbers={partyInfos.numbers || []}
                            gameType={gameType}
                        />
                    </div>
                    
                    <div className='flex items-center justify-center h-full p-2 md:p-0'>
                    <div className='grid grid-cols-10 gap-1 md:gap-2'>
                        {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => (
                              <div key={number} className={`text-white text-center text-xs md:text-base p-1 md:p-2 w-8 h-8 md:w-10 md:h-10 cursor-pointer transition-all duration-300 bg-gray-700 rounded ${partyInfos.numbers && partyInfos.numbers.length > 0 && partyInfos.numbers[partyInfos.numbers.length - 1] === number ? 'bg-green-500 scale-107' : (partyInfos.numbers && partyInfos.numbers.includes(number) ? 'bg-yellow-500/50 scale-105' : 'hover:bg-green-900')}`} onClick={() => handleNumberClick(number)}>
                                {number}
                            </div>
                        ))}
                    </div>
                    </div>
                    <div className='absolute bottom-0 right-0 flex items-center justify-center p-2'>
                        <p className='text-white text-sm'>{partyInfos.listUsers?.length || 0} joueurs</p>
                    </div>
                </div>

                {/* Sidebar desktop */}
                <div className='hidden md:flex absolute top-0 right-0 w-[35vh] h-full bg-gray-800 border-l z-2 border-gray-700 flex-col'>
                    {loadingGameInfo ? (
                        <div className='flex items-center justify-center h-full'>
                            <Loader2 className='w-5 h-5 text-white mr-2 animate-spin' />
                            <p className='text-white text-sm text-center'>Chargement...</p>
                        </div>
                    ) : (
                        <>
                            {/* Section supérieure avec dernier numéro et contrôles */}
                            <div className='p-4 border-b border-gray-700'>
                                <div className='relative flex items-center justify-center flex-col bg-gray-900 h-[15vh] w-full rounded-lg mb-4'>
                                    <h4 className='text-gray-300 text-sm'>Dernier numéro :</h4>
                                    <h3 className='text-white text-4xl font-bold'>{gameNumber}</h3>
                                </div>
                                
                                <div className='mb-4'>
                                    <h3 className='text-white text-sm mb-2'>Type de partie</h3>
                                    <div className='space-y-1'>
                                        <button 
                                            className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('1Ligne').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                            onClick={() => handleGameType('1Ligne')}
                                            disabled={getButtonState('1Ligne').isDisabled}
                                        >
                                            {getButtonState('1Ligne').isSelected ? 
                                                <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                getButtonState('1Ligne').isLoading ? 
                                                    <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                    <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                            }
                                            1 Ligne
                                        </button>
                                        <button 
                                            className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('2Lignes').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                            onClick={() => handleGameType('2Lignes')}
                                            disabled={getButtonState('2Lignes').isDisabled}
                                        >
                                            {getButtonState('2Lignes').isSelected ? 
                                                <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                getButtonState('2Lignes').isLoading ? 
                                                    <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                    <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                            }
                                            2 Lignes
                                        </button>
                                        <button 
                                            className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('CartonPlein').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                            onClick={() => handleGameType('CartonPlein')}
                                            disabled={getButtonState('CartonPlein').isDisabled}
                                        >
                                            {getButtonState('CartonPlein').isSelected ? 
                                                <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                getButtonState('CartonPlein').isLoading ? 
                                                    <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                    <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                            }
                                            Carton Plein
                                        </button>
                                    </div>
                                </div>

                                <button onClick={handleEndParty} className='text-white px-3 py-2 rounded-lg w-full cursor-pointer flex items-center justify-center transition-all duration-300 bg-gray-900 border border-green-700 hover:border-green-500 hover:text-green-500 text-center text-sm'>
                                  Partie Remportée
                                </button>
                                
                                <div className='flex items-center justify-center mt-3'>
                                    <input type="checkbox" className='mr-2 hidden' checked={clearNumbers} onChange={() => setClearNumbers(!clearNumbers)} />
                                    <label className='text-white text-xs cursor-pointer flex items-center' onClick={() => setClearNumbers(!clearNumbers)}>
                                        <div className={`w-5 h-5 rounded-xs mr-2 ${clearNumbers ? 'bg-transparent duration-300' : 'bg-white duration-300'} flex items-center justify-center`}>
                                            <CheckIcon className={`${clearNumbers ? 'text-white duration-300' : 'opacity-0 duration-300'}`} />
                                        </div>
                                        <p className={`text-xs ${clearNumbers ? 'text-green-500 duration-300' : 'text-white duration-300'}`}>Vider les numéros tirés</p>
                                    </label>
                                </div>

                            </div>

                            {/* Bouton Joueurs / Cartons en bas */}
                            <div className='p-4 w-full h-full flex items-end justify-center'>
                                <button onClick={handlePlayersList} className='p-2 bg-green-700 rounded-lg w-full cursor-pointer hover:bg-green-900 text-white text-sm'>
                                    Joueurs / Cartons
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Sidebar mobile (overlay) */}
                {showMobileSidebar && (
                    <div className='md:hidden fixed inset-0 z-40 mt-[6vh]' onClick={() => setShowMobileSidebar(false)}>
                        <div className='absolute inset-0 bg-black/50' />
                        <div 
                            className='absolute right-0 top-0 w-[80vw] max-w-[300px] h-full bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {loadingGameInfo ? (
                                <div className='flex items-center justify-center h-full'>
                                    <Loader2 className='w-5 h-5 text-white mr-2 animate-spin' />
                                    <p className='text-white text-sm text-center'>Chargement...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Section supérieure avec dernier numéro et contrôles */}
                                    <div className='p-4 border-b border-gray-700'>
                                        <div className='relative flex items-center justify-center flex-col bg-gray-900 h-[100px] w-full rounded-lg mb-4'>
                                            <h4 className='text-gray-300 text-sm'>Dernier numéro :</h4>
                                            <h3 className='text-white text-3xl font-bold'>{gameNumber}</h3>
                                        </div>
                                        
                                        <div className='mb-4'>
                                            <h3 className='text-white text-sm mb-2'>Type de partie</h3>
                                            <div className='space-y-1'>
                                                <button 
                                                    className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('1Ligne').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                                    onClick={() => handleGameType('1Ligne')}
                                                    disabled={getButtonState('1Ligne').isDisabled}
                                                >
                                                    {getButtonState('1Ligne').isSelected ? 
                                                        <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                        getButtonState('1Ligne').isLoading ? 
                                                            <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                            <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                                    }
                                                    1 Ligne
                                                </button>
                                                <button 
                                                    className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('2Lignes').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                                    onClick={() => handleGameType('2Lignes')}
                                                    disabled={getButtonState('2Lignes').isDisabled}
                                                >
                                                    {getButtonState('2Lignes').isSelected ? 
                                                        <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                        getButtonState('2Lignes').isLoading ? 
                                                            <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                            <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                                    }
                                                    2 Lignes
                                                </button>
                                                <button 
                                                    className={`text-white px-3 py-1.5 rounded-lg w-full text-left cursor-pointer flex items-center transition-all duration-300 text-sm ${getButtonState('CartonPlein').isSelected ? 'bg-green-700' : 'bg-gray-700 hover:bg-green-900'}`} 
                                                    onClick={() => handleGameType('CartonPlein')}
                                                    disabled={getButtonState('CartonPlein').isDisabled}
                                                >
                                                    {getButtonState('CartonPlein').isSelected ? 
                                                        <div className='w-2 h-2 bg-white rounded-full mr-2'></div> : 
                                                        getButtonState('CartonPlein').isLoading ? 
                                                            <Loader2 className='w-2 h-2 mr-2 animate-spin' /> : 
                                                            <div className='w-2 h-2 border border-white rounded-full mr-2'></div>
                                                    }
                                                    Carton Plein
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={handleEndParty} className='text-white px-3 py-2 rounded-lg w-full cursor-pointer flex items-center justify-center transition-all duration-300 bg-gray-900 border border-green-700 hover:border-green-500 hover:text-green-500 text-center text-sm'>
                                          Partie Remportée
                                        </button>
                                        
                                        <div className='flex items-center justify-center mt-3'>
                                            <label className='text-white text-xs cursor-pointer flex items-center' onClick={() => setClearNumbers(!clearNumbers)}>
                                                <div className={`w-5 h-5 rounded-xs mr-2 ${clearNumbers ? 'bg-transparent duration-300' : 'bg-white duration-300'} flex items-center justify-center`}>
                                                    <CheckIcon className={`${clearNumbers ? 'text-white duration-300' : 'opacity-0 duration-300'}`} />
                                                </div>
                                                <p className={`text-xs ${clearNumbers ? 'text-green-500 duration-300' : 'text-white duration-300'}`}>Vider les numéros tirés</p>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Actions rapides mobile */}
                                    <div className='p-4 space-y-2'>
                                        <button
                                            onClick={() => { handleCategoriesClick(); setShowMobileSidebar(false); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded w-full transition-colors duration-200"
                                        >
                                            <FolderOpen className='w-4 h-4' />
                                            Catégories
                                        </button>
                                        
                                        <button
                                            onClick={() => { handleStatsClick(); setShowMobileSidebar(false); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded w-full transition-colors duration-200"
                                        >
                                            <BarChart3 className='w-4 h-4' />
                                            Statistiques
                                        </button>

                                        <button 
                                            onClick={() => { handlePlayersList(); setShowMobileSidebar(false); }} 
                                            className='flex items-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-800 text-white text-sm rounded w-full transition-colors duration-200'
                                        >
                                            Joueurs / Cartons
                                        </button>
                                        
                                        <button
                                            onClick={handleLeaveGame}
                                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded w-full transition-colors duration-200"
                                        >
                                            <LogOut className='w-4 h-4' />
                                            Quitter la partie
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
              </div>

              {/* Modal Liste des Joueurs */}
              {showPlayersModal && (
                  <div 
                      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                      onClick={() => setShowPlayersModal(false)}
                  >
                      <div 
                          className="bg-gray-800 rounded-lg p-4 md:p-6 w-full h-full md:w-11/12 md:h-5/6 md:max-w-6xl flex flex-col md:rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-white text-lg md:text-xl font-bold">Liste des Joueurs</h2>
                              <button 
                                  onClick={() => setShowPlayersModal(false)}
                                  className="text-gray-400 hover:text-white text-2xl"
                              >
                                  ×
                              </button>
                          </div>
                          
                          <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">
                              {/* Liste des joueurs */}
                              <div className="w-full md:w-1/4 bg-gray-700 rounded-lg p-3 md:p-4 overflow-y-auto max-h-[30vh] md:max-h-none">
                                  <div className="flex justify-between items-center mb-3">
                                      <h3 className="text-white font-semibold">
                                          {showBannedPlayers ? 'Joueurs bannis' : 'Joueurs'}
                                      </h3>
                                      <div className="flex gap-2">
                                          {isCreator && !showBannedPlayers && (
                                              <button
                                                  onClick={() => setShowTempPlayerDialog(true)}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                                              >
                                                  + Temp
                                              </button>
                                          )}
                                          {isCreator && (
                                              <button
                                                  onClick={() => {
                                                      setShowBannedPlayers(!showBannedPlayers)
                                                      if (!showBannedPlayers) {
                                                          loadBannedPlayers()
                                                      }
                                                  }}
                                                  className={`px-2 py-1 rounded text-sm ${
                                                      showBannedPlayers 
                                                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                          : 'bg-red-600 hover:bg-red-700 text-white'
                                                  }`}
                                              >
                                                  {showBannedPlayers ? 'Classiques' : 'Bannis'}
                                              </button>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                      {!showBannedPlayers ? (
                                          <>
                                              <button
                                                  onClick={() => setSelectedPlayer('all')}
                                                  className={`w-full text-left p-2 rounded transition-colors ${
                                                      selectedPlayer === 'all' 
                                                          ? 'bg-green-600 text-white' 
                                                          : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                                                  }`}
                                              >
                                                  <div className="font-semibold">
                                                      All
                                                      <span className={`text-xs ml-1 ${
                                                          selectedPlayer === 'all' 
                                                              ? 'text-white' 
                                                              : 'text-gray-400'
                                                      }`}>(tous les cartons)</span>
                                                  </div>
                                              </button>
                                              
                                              {players.map((player) => (
                                                  <div
                                                      key={player.id}
                                                      className={`group relative w-full text-left p-2 rounded transition-colors border-l-4 ${
                                                          selectedPlayer === player.id 
                                                              ? 'bg-green-600 text-white' 
                                                              : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                                                      } ${
                                                          player.tempCreateRoom 
                                                              ? 'border-l-orange-400' 
                                                              : 'border-l-blue-400'
                                                      }`}
                                                      onContextMenu={(e) => {
                                                          if (isCreator && player.id !== user?.id) {
                                                              handleContextMenu(e, player.id)
                                                          }
                                                      }}
                                                  >
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-2">
                                                              {/* Icône de couronne pour le créateur */}
                                                              {player.isCreator && (
                                                                  <Crown className="w-4 h-4 text-yellow-400" />
                                                              )}
                                                              <div className="font-semibold">
                                                                  {player.name}
                                                                  {player.tempCreateRoom && (
                                                                      <span className={`text-xs ml-1 ${
                                                                          selectedPlayer === player.id 
                                                                              ? 'text-white' 
                                                                              : 'text-gray-400'
                                                                      }`}>(temp)</span>
                                                                  )}
                                                              </div>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                              {/* Pastille de connexion */}
                                                              <div className={`w-2 h-2 rounded-full ${
                                                                  player.isConnected 
                                                                      ? 'bg-green-400' 
                                                                      : 'bg-red-400'
                                                              }`} title={
                                                                  player.isConnected 
                                                                      ? 'Connecté' 
                                                                      : 'Déconnecté'
                                                              }></div>
                                                          </div>
                                                      </div>
                                                      {/* Bouton de sélection */}
                                                      <button
                                                          onClick={() => setSelectedPlayer(player.id)}
                                                          className="absolute inset-0 w-full h-full opacity-0"
                                                      />
                                                  </div>
                                              ))}
                                          </>
                                      ) : (
                                          <>
                                              {bannedPlayers.length === 0 ? (
                                                  <p className="text-gray-400 text-sm">Aucun joueur banni</p>
                                              ) : (
                                                  bannedPlayers.map((bannedPlayer) => (
                                                      <div
                                                          key={bannedPlayer.id}
                                                          className="w-full text-left p-2 rounded transition-colors bg-gray-600 text-gray-200 border-l-4 border-l-red-400"
                                                      >
                                                          <div className="flex items-center justify-between">
                                                              <div className="font-semibold">
                                                                  {bannedPlayer.name}
                                                              </div>
                                                              <button
                                                                  onClick={() => handleUnbanPlayer(bannedPlayer.id)}
                                                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                                              >
                                                                  Débannir
                                                              </button>
                                                          </div>
                                                      </div>
                                                  ))
                                              )}
                                          </>
                                      )}
                                  </div>
                              </div>

                              {/* Liste des cartons */}
                              <div className="flex-1 bg-gray-700 rounded-lg p-3 md:p-4 overflow-y-auto relative">
                                  <div className="flex justify-between items-center mb-3">
                                      <h3 className="text-white font-semibold">
                                          Cartons {selectedPlayer === 'all' ? '(Tous)' : `(${players.find(p => p.id === selectedPlayer)?.name || 'Joueur'})`}
                                      </h3>
                                      {selectedPlayer !== 'all' && (isCreator || selectedPlayer === user?.id) && (
                                          <div className="flex gap-2">
                                              <button
                                                  onClick={handleAddCartonClick}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                              >
                                                  + Carton
                                              </button>
                                              {/* Afficher le bouton Bannir/Supprimer seulement pour le créateur et pas pour lui-même */}
                                              {isCreator && selectedPlayer !== user?.id && (
                                                  <button
                                                      onClick={() => {
                                                          const player = players.find(p => p.id === selectedPlayer)
                                                          if (player) {
                                                              if (player.tempCreateRoom) {
                                                                  // Supprimer l'utilisateur temporaire
                                                                  handleDeleteTempPlayer(player.id)
                                                              } else {
                                                                  // Bannir l'utilisateur avec compte
                                                                  handleBanPlayer(player.id)
                                                              }
                                                          }
                                                      }}
                                                      className={`px-3 py-1 rounded text-sm ${
                                                          players.find(p => p.id === selectedPlayer)?.tempCreateRoom
                                                              ? 'bg-red-600 hover:bg-red-700 text-white'
                                                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                                                      }`}
                                                  >
                                                      {players.find(p => p.id === selectedPlayer)?.tempCreateRoom ? 'Supprimer' : 'Bannir'}
                                                  </button>
                                              )}
                                          </div>
                                      )}
                                  </div>
                                  
                                  {getFilteredCartons().length === 0 ? (
                                      <div className="text-gray-400 text-center py-8">
                                          Aucun carton trouvé
                                      </div>
                                  ) : (
                                      <div className="w-full space-y-4">
                                          {getFilteredCartons().map((carton, index) => {
                                              // Convertir les nombres du carton en format compatible avec le composant Carton
                                              // Le tableau numbers contient exactement 27 éléments (0 = case vide, nombre = valeur)
                                              // Convertir 0 en '*' et les nombres en string
                                              const cartonData = carton.numbers.map(number => 
                                                  number === 0 ? '*' : number.toString()
                                              )
                                              
                                              return (
                                                  <div key={carton.id} className="w-full flex flex-col items-center">
                                                      <div className="text-white font-semibold mb-2">
                                                          Carton {index + 1}
                                                      </div>
                                                      <div 
                                                          className="w-full flex justify-center cursor-context-menu"
                                                          onContextMenu={(e) => handleCartonRightClick(e, carton.id)}
                                                      >
                                                          <Carton 
                                                              cartonInitial={{ listNumber: cartonData }}
                                                              mode="view"
                                                              height="200px"
                                                          />
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Menu contextuel */}
              {contextMenu.show && (
                  <div
                      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[150px]"
                      style={{
                          left: contextMenu.x,
                          top: contextMenu.y,
                          transform: 'translate(-50%, -100%)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                  >
                      <button
                          onClick={() => handleTransferCreator(contextMenu.playerId)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                          Transférer le rôle de créateur
                      </button>
                  </div>
              )}

              {/* Menu contextuel pour les cartons */}
              {cartonContextMenu.show && (
                  <div
                      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 min-w-48"
                      style={{
                          left: cartonContextMenu.x,
                          top: cartonContextMenu.y,
                          transform: 'translate(-50%, -100%)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                  >
                      <button
                          onClick={handleEditCartonCategory}
                          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                          <FolderOpen className="w-4 h-4" />
                          Éditer la catégorie
                      </button>
                  </div>
              )}

              {/* Dialog pour créer un joueur temporaire */}
              {showTempPlayerDialog && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md">
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-white text-xl font-bold">Créer un joueur temporaire</h2>
                              <button 
                                  onClick={() => {
                                      setShowTempPlayerDialog(false)
                                      setTempPlayerName('')
                                  }}
                                  className="text-gray-400 hover:text-white text-2xl"
                              >
                                  ×
                              </button>
                          </div>
                          
                          <div className="mb-4">
                              <label className="block text-white text-sm font-medium mb-2">
                                  Nom du joueur
                              </label>
                              <input
                                  type="text"
                                  value={tempPlayerName}
                                  onChange={(e) => setTempPlayerName(e.target.value)}
                                  onKeyPress={(e) => {
                                      if (e.key === 'Enter' && tempPlayerName.trim()) {
                                          handleCreateTempPlayer()
                                      }
                                  }}
                                  placeholder="Entrez le nom du joueur"
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                  autoFocus
                              />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                              <button
                                  onClick={() => {
                                      setShowTempPlayerDialog(false)
                                      setTempPlayerName('')
                                  }}
                                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                  disabled={isCreatingTempPlayer}
                              >
                                  Annuler
                              </button>
                              <button
                                  onClick={handleCreateTempPlayer}
                                  disabled={!tempPlayerName.trim() || isCreatingTempPlayer}
                                  className={`px-4 py-2 rounded-lg transition-colors ${
                                      !tempPlayerName.trim() || isCreatingTempPlayer
                                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                              >
                                  {isCreatingTempPlayer ? (
                                      <>
                                          <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                                          Création...
                                      </>
                                  ) : (
                                      'Créer'
                                  )}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Modal Ajouter un Carton */}
              {showAddCartonModal && (
                  <div 
                      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                      onClick={() => setShowAddCartonModal(false)}
                  >
                      <div 
                          className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-2xl flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-white text-xl font-bold">
                                  Ajouter un carton pour {players.find(p => p.id === selectedPlayer)?.name || 'Joueur'}
                              </h2>
                              <button 
                                  onClick={() => setShowAddCartonModal(false)}
                                  className="text-gray-400 hover:text-white text-2xl"
                              >
                                  ×
                              </button>
                          </div>
                          
                          <div className="flex flex-col items-center gap-4">
                              <div className="w-fit">
                                  <Carton 
                                      key={cartonKey}
                                      mode="create"
                                      height="300px"
                                      addCartonInit={addCartonTrigger}
                                      onAddCarton={handleAddCarton}
                                      onValidationError={handleCartonValidationError}
                                      onValidationChange={handleCartonValidationChange}
                                  />
                              </div>
                              
                              <div className="flex flex-col items-center gap-2">
                                  <div className="text-white text-sm">
                                      Progression: {cartonValidation.totalNumbers}/15 nombres
                                  </div>
                                  
                                  {cartonValidation.errors.length > 0 && (
                                      <div className="text-red-400 text-sm max-w-md text-center">
                                          {cartonValidation.errors[0]}
                                      </div>
                                  )}
                                  
                                  <div className="flex gap-3 mt-4">
                                      <button
                                          onClick={() => setShowAddCartonModal(false)}
                                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                                      >
                                          Annuler
                                      </button>
                                    <button
                                        onClick={() => {
                                            if (cartonValidation.isValid && !isAddingCarton) {
                                                setAddCartonTrigger(true)
                                                setTimeout(() => setAddCartonTrigger(false), 100)
                                            } else {
                                                toast.error('Le carton n\'est pas valide')
                                            }
                                        }}
                                        disabled={!cartonValidation.isValid || isAddingCarton}
                                        className={`px-4 py-2 rounded font-medium ${
                                            cartonValidation.isValid && !isAddingCarton
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {isAddingCarton ? 'Ajout...' : 'Ajouter le carton'}
                                    </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Modal des gagnants */}
              <WinnerModal 
                  isVisible={showWinnerModal}
                  onClose={closeWinnerModal}
                  winners={winners}
                  gameType={gameType}
              />

              {/* Dialog des paramètres de la room */}
              <RoomSettingsDialog
                  isOpen={showRoomSettingsDialog}
                  onClose={() => setShowRoomSettingsDialog(false)}
                  roomData={{
                      code: gameId,
                      name: partyData?.name,
                      isPrivate: !partyData?.isPublic,
                      password: '' // Le mot de passe ne doit pas être exposé côté client
                  }}
                  onUpdate={handleRoomUpdate}
              />

              {/* Modal des catégories */}
              <CategoriesModal
                  isOpen={showCategoriesModal}
                  onClose={async () => {
                      setShowCategoriesModal(false)
                      // Recharger les catégories après fermeture du modal
                      try {
                          const token = Cookies.get('token')
                          if (token) {
                              const response = await fetch(`/api/game/${gameId}/categories`, {
                                  headers: {
                                      'Authorization': `Bearer ${token}`
                                  }
                              })
                              const data = await response.json()
                              if (response.ok && data.success) {
                                  setCategories(data.categories || [])
                              }
                              // Recharger aussi les cartons pour prendre en compte les changements
                              const playersResponse = await fetch(`/api/game/${gameId}/players`, {
                                  headers: {
                                      'Authorization': `Bearer ${token}`
                                  }
                              })
                              const playersData = await playersResponse.json()
                              if (playersResponse.ok && playersData.success) {
                                  setCartons(playersData.cartons || [])
                              }
                          }
                      } catch (error) {
                          console.log('Erreur lors du rechargement des catégories:', error)
                      }
                  }}
                  gameId={gameId}
              />

              {/* Modal des statistiques */}
              <StatsModal
                  isOpen={showStatsModal}
                  onClose={() => setShowStatsModal(false)}
                  gameId={gameId}
                  players={players}
                  cartons={activeCartons}
                  partyInfos={partyInfos}
                  gameType={gameType}
              />

              {/* Modal pour éditer la catégorie d'un carton */}
              <CartonCategoryModal
                  isOpen={showCartonCategoryModal}
                  onClose={() => setShowCartonCategoryModal(false)}
                  carton={selectedCartonForCategory}
                  gameId={gameId}
                  onUpdate={handleCartonUpdate}
              />
          </ProtectedRoute>
      )
}

export default GamePage