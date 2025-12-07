'use client'
import React, { useState, useEffect, useContext, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSocketClient } from '@/hooks/socketClient'
import { GlobalContext } from '@/contexts/GlobalState'
import { Loader2, Settings, X, Plus, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Cookies from 'js-cookie'

const GrillePage = () => {
    const { gameId } = useParams()
    const { user } = useAuth()
    const [gameNumber, setGameNumber] = useState(0)
    const { socket, isConnected, connect } = useSocketClient()
    const { partyInfos, setPartyInfos } = useContext(GlobalContext)
    const [loadingGameInfo, setLoadingGameInfo] = useState(true)
    const [partyData, setPartyData] = useState(null)
    const [currentPubIndex, setCurrentPubIndex] = useState(0)
    const [showPubSettings, setShowPubSettings] = useState(false)
    const [newPubUrl, setNewPubUrl] = useState('')
    const fileInputRef = useRef(null)

    // Liste des publicités (images locales ou en ligne)
    const [pubs, setPubs] = useState([])
    const [isCreator, setIsCreator] = useState(false)

    // Sauvegarder les pubs dans la base de données
    const savePubs = async (newPubs) => {
        try {
            const token = Cookies.get('token')
            if (!token) return

            await fetch(`/api/game/${gameId}/pubs`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pubs: newPubs })
            })
        } catch (error) {
            console.log('Erreur lors de la sauvegarde des pubs:', error)
        }
    }

    // Ajouter une publicité via URL
    const addPub = async () => {
        if (newPubUrl.trim()) {
            const newPubs = [...pubs, newPubUrl.trim()]
            setPubs(newPubs)
            setNewPubUrl('')
            await savePubs(newPubs)
        }
    }

    // Importer une image et la convertir en base64
    const handleFileImport = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = async () => {
                const newPubs = [...pubs, reader.result]
                setPubs(newPubs)
                await savePubs(newPubs)
            }
            reader.readAsDataURL(file)
        }
        // Reset l'input pour permettre de réimporter le même fichier
        e.target.value = ''
    }

    // Supprimer une publicité
    const removePub = async (index) => {
        const newPubs = pubs.filter((_, i) => i !== index)
        setPubs(newPubs)
        if (currentPubIndex >= newPubs.length) {
            setCurrentPubIndex(0)
        }
        await savePubs(newPubs)
    }


    // Défilement automatique des publicités
    useEffect(() => {
        if (pubs.length <= 1) return
        
        const interval = setInterval(() => {
            setCurrentPubIndex((prev) => (prev + 1) % pubs.length)
        }, 5000) // Change toutes les 5 secondes

        return () => clearInterval(interval)
    }, [pubs.length])

    // Charger les informations de la partie au démarrage (API publique)
    useEffect(() => {
        const loadPartyData = async () => {
            try {
                // Utiliser l'API publique pour la grille (pas besoin de token)
                const response = await fetch(`/api/game/${gameId}/grille`)

                const data = await response.json()                

                if (response.ok && data.success) {
                    setPartyData(data.room)
                    // Vérifier si l'utilisateur est le créateur
                    setIsCreator(data.room.creator?.id === user?.id)
                    
                    setGameNumber(data.room.currentNumber || 0)
                    
                    // Charger les pubs
                    setPubs(data.pubs || [])
                    
                    // Mettre à jour le contexte global
                    setPartyInfos(prev => ({
                        ...prev,
                        gameType: data.room.gameType,
                        numbers: data.room.listNumbers || [],
                        roomId: data.room.id,
                        creator: data.room.creator
                    }))
                } else {
                    console.log(`Erreur lors du chargement de la room: ${data.error}`)
                }
            } catch (error) {
                console.log(`Erreur lors du chargement de la partie: ${error.message}`)
            } finally {
                setLoadingGameInfo(false)
            }
        }

        if (gameId) {
            loadPartyData()
        }
    }, [gameId, setPartyInfos, user?.id])

    // Connecter automatiquement au socket
    useEffect(() => {
        if (!isConnected) {
            connect()
        }
    }, [connect, isConnected])

    // Rejoindre le jeu et écouter les événements (fonctionne sans être connecté)
    useEffect(() => {
        if (!socket || !gameId) return

        // Fonction pour rejoindre le jeu
        const joinGame = () => {
            console.log('🎯 Grille: Rejoindre le jeu', gameId)
            socket.emit('join_game', { gameId: gameId, userId: user?.id || null })
        }

        // Rejoindre au premier connect et à chaque reconnexion
        if (isConnected) {
            joinGame()
        }

        // Écouter les reconnexions pour rejoindre à nouveau la room
        const handleConnect = () => {
            console.log('🎯 Grille: Socket (re)connecté, rejoindre la room')
            joinGame()
        }

        // Handlers pour les événements du jeu
        const handleGameJoined = (data) => {
            console.log('🎯 Grille: game_joined reçu', data)
            if (data.success && data.game) {
                setGameNumber(data.game.currentNumber)
                setPartyInfos(prev => ({ 
                    ...prev, 
                    gameType: data.game.gameType, 
                    numbers: data.game.numbers, 
                    gameId: data.game.id,
                    listUsers: data.game.listUsers
                }))
            }
        }

        const handleNumberToggled = (data) => {
            console.log('🎯 Grille: numberToggled reçu', data)
            setGameNumber(data.allNumbers.length > 0 ? data.allNumbers[data.allNumbers.length - 1] : 0)
            setPartyInfos(prev => ({ 
                ...prev, 
                numbers: data.allNumbers
            }))
        }

        const handleNewParty = (data) => {
            console.log('🎯 Grille: newParty reçu', data)
            setPartyInfos(prev => ({ 
                ...prev, 
                gameType: data.party.gameType,
                numbers: data.party.listNumbers
            }))
            setGameNumber(data.party.listNumbers.length > 0 ? data.party.listNumbers[data.party.listNumbers.length - 1] : 0)
        }

        const handleGameTypeChanged = (data) => {
            console.log('🎯 Grille: game_type_changed reçu', data)
            setPartyInfos(prev => ({
                ...prev,
                gameType: data.gameType
            }))
        }

        // Écouter les événements
        socket.on('connect', handleConnect)
        socket.on('game_joined', handleGameJoined)
        socket.on('numberToggled', handleNumberToggled)
        socket.on('newParty', handleNewParty)
        socket.on('game_type_changed', handleGameTypeChanged)

        // Nettoyage des listeners
        return () => {
            console.log('🎯 Grille: Nettoyage des listeners')
            socket.off('connect', handleConnect)
            socket.off('game_joined', handleGameJoined)
            socket.off('numberToggled', handleNumberToggled)
            socket.off('newParty', handleNewParty)
            socket.off('game_type_changed', handleGameTypeChanged)
        }
    }, [socket, isConnected, gameId])

    if (loadingGameInfo) {
        return (
            <div className='w-full h-screen bg-gray-900 flex items-center justify-center'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='w-12 h-12 text-green-500 animate-spin' />
                    <p className='text-white text-lg'>Chargement de la grille...</p>
                </div>
            </div>
        )
    }

    return (
        <div className='w-full min-h-screen bg-gray-900 flex flex-col'>
            {/* Contenu principal */}
            <div className='flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 p-4'>
                
                {/* Section dernier numéro + Publicité */}
                <div className='w-full lg:w-auto flex flex-col items-center gap-6'>
                    <div className='relative flex items-center justify-center flex-col bg-gray-800 h-[35vh] w-[35vh] rounded-2xl border border-gray-700 shadow-2xl'>
                        <h4 className='text-gray-400 text-lg uppercase tracking-wider mb-3'>Dernier numéro</h4>
                        <div className={`text-9xl font-bold transition-all duration-500 ${gameNumber > 0 ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                            {gameNumber || '-'}
                        </div>
                        <div className='absolute bottom-4 left-0 right-0 flex justify-center'>
                            <span className='text-gray-500 text-sm'>
                                {partyInfos.numbers?.length || 0} numéros tirés
                            </span>
                        </div>
                    </div>

                    {/* Encart publicitaire sous le dernier numéro */}
                    {pubs.length > 0 && (
                        <div className='relative w-[35vh] h-[280px] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg'>
                            {pubs.map((pub, index) => (
                                <img
                                    key={index}
                                    src={pub}
                                    alt={`Publicité ${index + 1}`}
                                    className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-700 ${
                                        index === currentPubIndex 
                                            ? 'opacity-100 scale-100' 
                                            : 'opacity-0 scale-95'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Grille des numéros */}
                <div className='flex flex-col items-center'>
                    <div className='grid grid-cols-10 gap-2 lg:gap-3'>
                        {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => {
                            const isLastNumber = partyInfos.numbers && partyInfos.numbers.length > 0 && partyInfos.numbers[partyInfos.numbers.length - 1] === number
                            const isDrawn = partyInfos.numbers && partyInfos.numbers.includes(number)
                            
                            return (
                                <div 
                                    key={number} 
                                    className={`
                                        text-white text-center flex items-center justify-center
                                        w-10 h-10 lg:w-12 lg:h-12
                                        rounded-lg font-medium
                                        transition-all duration-300
                                        ${isLastNumber 
                                            ? 'bg-green-500 scale-110 shadow-lg shadow-green-500/50 animate-pulse' 
                                            : isDrawn 
                                                ? 'bg-yellow-500/60 scale-105 shadow-md shadow-yellow-500/30' 
                                                : 'bg-gray-700 hover:bg-gray-600'
                                        }
                                    `}
                                >
                                    {number}
                                </div>
                            )
                        })}
                    </div>
                    
                    {/* Légende */}
                    <div className='flex items-center gap-6 mt-6'>
                        <div className='flex items-center gap-2'>
                            <div className='w-4 h-4 rounded bg-gray-700'></div>
                            <span className='text-gray-400 text-sm'>Non tiré</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='w-4 h-4 rounded bg-yellow-500/60'></div>
                            <span className='text-gray-400 text-sm'>Tiré</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='w-4 h-4 rounded bg-green-500'></div>
                            <span className='text-gray-400 text-sm'>Dernier</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Type de jeu actuel en bas */}
            <div className='fixed bottom-0 left-0 w-full h-[5vh] bg-gray-800 border-t border-gray-700 flex items-center justify-center'>
                <span className='text-gray-400 text-sm'>
                    Type de jeu : <span className='text-white font-medium'>
                        {partyInfos.gameType === '1Ligne' ? '1 Ligne' 
                            : partyInfos.gameType === '2Lignes' ? '2 Lignes' 
                            : partyInfos.gameType === 'CartonPlein' ? 'Carton Plein' 
                            : partyInfos.gameType || '1 Ligne'}
                    </span>
                </span>
            </div>

            {/* Bouton paramètres en bas à gauche */}
            <button
                onClick={() => setShowPubSettings(true)}
                className='fixed bottom-[6vh] left-4 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110'
            >
                <Settings className='w-4 h-4 text-gray-300' />
            </button>

            {/* Modal paramètres des publicités */}
            {showPubSettings && (
                <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
                    <div className='bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl'>
                        {/* Header */}
                        <div className='flex items-center justify-between p-4 border-b border-gray-700'>
                            <h3 className='text-white text-lg font-semibold'>Gérer les publicités</h3>
                            <button
                                onClick={() => setShowPubSettings(false)}
                                className='text-gray-400 hover:text-white transition-colors'
                            >
                                <X className='w-6 h-6' />
                            </button>
                        </div>

                        {/* Contenu */}
                        <div className='p-4 overflow-y-auto max-h-[50vh]'>
                            {/* Ajouter une nouvelle pub */}
                            <div className='space-y-3 mb-4'>
                                {/* Option 1: URL */}
                                <div className='flex gap-2'>
                                    <input
                                        type='text'
                                        value={newPubUrl}
                                        onChange={(e) => setNewPubUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addPub()}
                                        placeholder="URL de l'image..."
                                        className='flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-green-500'
                                    />
                                    <button
                                        onClick={addPub}
                                        className='bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
                                    >
                                        <Plus className='w-5 h-5' />
                                    </button>
                                </div>

                                {/* Option 2: Import fichier */}
                                <div className='flex items-center gap-2'>
                                    <span className='text-gray-400 text-sm'>ou</span>
                                    <input
                                        type='file'
                                        ref={fileInputRef}
                                        onChange={handleFileImport}
                                        accept='image/*'
                                        className='hidden'
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className='flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-600 border-dashed'
                                    >
                                        <Upload className='w-5 h-5' />
                                        Importer une image
                                    </button>
                                </div>
                            </div>

                            {/* Liste des pubs */}
                            <div className='space-y-3'>
                                {pubs.length === 0 ? (
                                    <p className='text-gray-400 text-center py-4'>Aucune publicité configurée</p>
                                ) : (
                                    pubs.map((pub, index) => {
                                        const isBase64 = pub.startsWith('data:image')
                                        return (
                                            <div key={index} className='flex items-center gap-3 bg-gray-700/50 rounded-lg p-3'>
                                                <img
                                                    src={pub}
                                                    alt={`Pub ${index + 1}`}
                                                    className='w-16 h-16 object-contain bg-gray-800 rounded'
                                                />
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-white text-sm truncate'>
                                                        {isBase64 ? '📁 Image importée' : pub}
                                                    </p>
                                                    <p className='text-gray-400 text-xs'>
                                                        {isBase64 ? 'Stockée en base64' : 'URL externe'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removePub(index)}
                                                    className='text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-colors'
                                                >
                                                    <Trash2 className='w-5 h-5' />
                                                </button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className='p-4 border-t border-gray-700'>
                            <button
                                onClick={() => setShowPubSettings(false)}
                                className='w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors'
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GrillePage

