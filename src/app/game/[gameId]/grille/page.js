'use client'
import React, { useState, useEffect, useContext } from 'react'
import { useParams } from 'next/navigation'
import { useSocketClient } from '@/hooks/socketClient'
import { GlobalContext } from '@/contexts/GlobalState'
import { Loader2, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Cookies from 'js-cookie'

const GrillePage = () => {
    const { gameId } = useParams()
    const { user } = useAuth()
    const [gameNumber, setGameNumber] = useState(0)
    const { socket, isConnected, connect, on, off } = useSocketClient()
    const { partyInfos, setPartyInfos } = useContext(GlobalContext)
    const [loadingGameInfo, setLoadingGameInfo] = useState(true)
    const [partyData, setPartyData] = useState(null)

    // Charger les informations de la partie au démarrage
    useEffect(() => {
        const loadPartyData = async () => {
            try {
                const token = Cookies.get('token')
                if (!token) {
                    console.log('Erreur: Token d\'authentification manquant')
                    setLoadingGameInfo(false)
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
                    setGameNumber(latestParty && latestParty.listNumbers.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0)
                    
                    // Mettre à jour le contexte global avec la dernière partie
                    const lastParty = data.room.Party[0]
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
    }, [gameId, setPartyInfos])

    // Connecter automatiquement au socket
    useEffect(() => {
        if (!isConnected) {
            connect()
        }
    }, [connect, isConnected])

    // Rejoindre le jeu et écouter les événements
    useEffect(() => {
        if (socket && isConnected && user?.id) {
            // Rejoindre le jeu
            socket.emit('join_game', { gameId: gameId, userId: user.id })

            // Écouter les événements du jeu
            on('game_joined', (data) => {
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
                setLoadingGameInfo(false)
            })

            on('numberToggled', (data) => {
                setGameNumber(data.allNumbers.length > 0 ? data.allNumbers[data.allNumbers.length - 1] : 0)
                setPartyInfos(prev => ({ 
                    ...prev, 
                    numbers: data.allNumbers
                }))
            })

            on('newParty', (data) => {
                setPartyInfos(prev => ({ 
                    ...prev, 
                    gameType: data.party.gameType,
                    numbers: data.party.listNumbers
                }))
                setGameNumber(data.party.listNumbers.length > 0 ? data.party.listNumbers[data.party.listNumbers.length - 1] : 0)
            })

            on('game_type_changed', (data) => {
                setPartyInfos(prev => ({
                    ...prev,
                    gameType: data.gameType
                }))
            })

            // Nettoyage des listeners
            return () => {
                off('game_joined')
                off('numberToggled')
                off('newParty')
                off('game_type_changed')
            }
        }
    }, [socket, isConnected, gameId, user?.id, on, off, setPartyInfos])

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
            {/* En-tête avec le nom de la partie et statut de connexion */}
            <div className='fixed top-0 left-0 w-full h-[6vh] bg-gray-800 z-50 border-b border-gray-700'>
                <div className='flex items-center justify-between px-4 h-full'>
                    <div className='text-white text-sm flex items-center gap-2'>
                        <span className='font-semibold'>{partyData?.name || 'Partie'}</span>
                        <span className='text-gray-400'>|</span>
                        <span className='text-gray-400'>Grille en direct</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        {isConnected ? (
                            <div className='flex items-center gap-2 text-green-400 text-sm'>
                                <Wifi className='w-4 h-4' />
                                <span>Connecté</span>
                            </div>
                        ) : (
                            <div className='flex items-center gap-2 text-red-400 text-sm'>
                                <WifiOff className='w-4 h-4' />
                                <span>Déconnecté</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className='flex-1 mt-[6vh] flex flex-col lg:flex-row items-center justify-center gap-8 p-4'>
                
                {/* Section dernier numéro */}
                <div className='w-full lg:w-auto flex justify-center'>
                    <div className='relative flex items-center justify-center flex-col bg-gray-800 h-[25vh] w-[25vh] rounded-2xl border border-gray-700 shadow-2xl'>
                        <h4 className='text-gray-400 text-sm uppercase tracking-wider mb-2'>Dernier numéro</h4>
                        <div className={`text-7xl font-bold transition-all duration-500 ${gameNumber > 0 ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                            {gameNumber || '-'}
                        </div>
                        <div className='absolute bottom-3 left-0 right-0 flex justify-center'>
                            <span className='text-gray-500 text-xs'>
                                {partyInfos.numbers?.length || 0} numéros tirés
                            </span>
                        </div>
                    </div>
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
                    Type de jeu : <span className='text-white font-medium'>{partyInfos.gameType || '1 Ligne'}</span>
                </span>
            </div>
        </div>
    )
}

export default GrillePage

