import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { useActivePlayers } from '@/hooks/useActivePlayers'

export default function ActivePlayersBadge({ roomCode, initialCount = 0, className = '' }) {
  const { getActivePlayersCount, isConnected, isInitialized } = useActivePlayers()
  const [activeCount, setActiveCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(true)

  // Mettre à jour le compteur quand les données changent
  useEffect(() => {
    const count = getActivePlayersCount(roomCode)
    
    // Si nous avons une valeur depuis le hook, l'utiliser
    if (isInitialized && count !== undefined) {
      setActiveCount(count)
      setIsLoading(false)
    } else if (!isInitialized) {
      // Si pas encore initialisé, utiliser la valeur initiale
      setActiveCount(initialCount)
      setIsLoading(false)
    }
  }, [getActivePlayersCount, roomCode, activeCount, isInitialized, initialCount])

  // Si en cours de chargement, afficher un indicateur
  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md text-xs font-medium ${className}`}>
        <Users className="w-3 h-3" />
        <span>...</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium border border-blue-200 dark:border-blue-800 ${className}`}>
      <Users className="w-3 h-3" />
      <span>{activeCount}</span>
      {isConnected && (
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" title="Temps réel"></div>
      )}
    </div>
  )
} 