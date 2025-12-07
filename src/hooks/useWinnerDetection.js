'use client'
import { useState, useEffect, useCallback } from 'react'

export const useWinnerDetection = (cartons = [], drawnNumbers = [], gameType = '1Ligne', playersData = []) => {
    const [winners, setWinners] = useState([])
    const [showWinnerModal, setShowWinnerModal] = useState(false)

    // Fonction pour vérifier si une ligne est complète
    const isLineComplete = useCallback((cartonData, lineIndex, drawnNumbers) => {
        const lineStart = lineIndex * 9
        const lineEnd = lineStart + 9
        const line = cartonData.slice(lineStart, lineEnd)
        
        // Compter les numéros de la ligne qui ont été tirés
        let numbersInLine = 0
        let drawnInLine = 0
        
        for (let i = 0; i < 9; i++) {
            const number = parseInt(line[i])
            if (!isNaN(number) && number > 0) {
                numbersInLine++
                if (drawnNumbers.includes(number)) {
                    drawnInLine++
                }
            }
        }
        
        // Une ligne est complète si elle a exactement 5 numéros et qu'ils sont tous tirés
        return numbersInLine === 5 && drawnInLine === 5
    }, [])

    // Fonction pour vérifier si un carton est gagnant selon le mode de jeu
    const checkWinningCarton = useCallback((carton, cartonIndex, drawnNumbers, gameType, playersData) => {
        // Convertir les données du carton (0 = case vide, nombre = valeur)
        const cartonData = carton.numbers.map(number => 
            number === 0 ? '*' : number.toString()
        )

        const completedLines = []
        
        // Vérifier chaque ligne (3 lignes par carton)
        for (let lineIndex = 0; lineIndex < 3; lineIndex++) {
            if (isLineComplete(cartonData, lineIndex, drawnNumbers)) {
                completedLines.push(lineIndex)
            }
        }

        let isWinner = false
        
        // Déterminer si c'est gagnant selon le mode de jeu
        switch (gameType) {
            case '1Ligne':
                isWinner = completedLines.length >= 1
                break
            case '2Lignes':
                isWinner = completedLines.length >= 2
                break
            case 'CartonPlein':
                isWinner = completedLines.length === 3
                break
            default:
                isWinner = false
        }

        if (isWinner) {
            return {
                cartonId: carton.id,
                cartonIndex: cartonIndex,
                playerId: carton.userId,
                playerName: getPlayerName(carton.userId, playersData),
                cartonData: cartonData,
                completedLines: completedLines,
                gameType: gameType
            }
        }

        return null
    }, [isLineComplete])

    // Fonction helper pour obtenir le nom du joueur
    const getPlayerName = useCallback((userId, playersData) => {
        if (playersData && playersData.length > 0) {
            const player = playersData.find(p => p.id === userId)
            return player ? player.name : `Joueur ${userId.slice(-4)}`
        }
        return `Joueur ${userId.slice(-4)}`
    }, [])

    // Fonction pour détecter tous les gagnants
    const detectWinners = useCallback(() => {
        if (!cartons || cartons.length === 0 || !drawnNumbers || drawnNumbers.length === 0) {
            return []
        }

        const newWinners = []

        cartons.forEach((carton, index) => {
            const winner = checkWinningCarton(carton, index, drawnNumbers, gameType, playersData)
            if (winner) {
                newWinners.push(winner)
            }
        })

        return newWinners
    }, [cartons, drawnNumbers, gameType, playersData, checkWinningCarton])

    // Hook pour détecter automatiquement les gagnants quand les numéros changent
    useEffect(() => {
        const newWinners = detectWinners()
        
        // Ne mettre à jour que s'il y a de nouveaux gagnants
        if (newWinners.length > 0 && newWinners.length !== winners.length) {
            setWinners(newWinners)
            setShowWinnerModal(true)
        } else if (newWinners.length === 0 && winners.length > 0) {
            // Reset si plus de gagnants
            setWinners([])
            setShowWinnerModal(false)
        }
    }, [drawnNumbers, cartons, gameType, playersData, detectWinners, winners.length])

    // Fonction pour fermer la modal
    const closeWinnerModal = useCallback(() => {
        setShowWinnerModal(false)
    }, [])

    // Fonction pour mettre à jour manuellement les données des joueurs
    const updatePlayerNames = useCallback((playersData) => {
        if (winners.length > 0 && playersData) {
            const updatedWinners = winners.map(winner => {
                const player = playersData.find(p => p.id === winner.playerId)
                return {
                    ...winner,
                    playerName: player ? player.name : winner.playerName
                }
            })
            setWinners(updatedWinners)
        }
    }, [winners])

    return {
        winners,
        showWinnerModal,
        closeWinnerModal,
        updatePlayerNames,
        detectWinners: () => detectWinners() // Fonction manuelle si besoin
    }
}
