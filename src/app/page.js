'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, X, Users, Lock, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useActivePlayers } from '@/hooks/useActivePlayers'
import ActivePlayersBadge from '@/components/ActivePlayersBadge'

export default function Home() {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [publicRooms, setPublicRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const router = useRouter()
  
  // Hook pour les joueurs actifs en temps réel
  const { subscribeToRooms } = useActivePlayers()

  // États pour les modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPrivateJoinModal, setShowPrivateJoinModal] = useState(false)
  
  // États pour les formulaires
  const [createForm, setCreateForm] = useState({
    roomName: '',
    isPublic: true,
    password: '',
    maxPlayers: 10
  })
  const [joinForm, setJoinForm] = useState({
    roomCode: '',
    password: ''
  })

  // Charger les rooms publiques
  useEffect(() => {
    fetchPublicRooms()
  }, [])

  // S'abonner aux mises à jour des joueurs actifs quand les rooms sont chargées
  useEffect(() => {
    if (publicRooms.length > 0) {
      const roomCodes = publicRooms.map(room => room.code)
      subscribeToRooms(roomCodes)
    }
  }, [publicRooms, subscribeToRooms])

  const fetchPublicRooms = async () => {
    try {
      setLoadingRooms(true)
      const response = await fetch('/api/game/public-rooms')
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPublicRooms(data.rooms)
      }
    } catch (error) {
      console.log('Erreur lors du chargement des rooms publiques:', error)
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleCreateParty = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    setShowCreateModal(true)
  }

  const handleCreatePartySubmit = async (e) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const token = Cookies.get('token')
      
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType: '1Ligne',
          roomName: createForm.roomName || `Partie de ${user.name}`,
          isPublic: createForm.isPublic,
          password: createForm.isPublic ? null : createForm.password,
          maxPlayers: createForm.maxPlayers
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push(`/game/${data.gameCode}`)
      } else {
        console.log('Erreur lors de la création de la partie:', data.error)
      }
    } catch (error) {
      console.log('Erreur lors de la création de la partie:', error)
    } finally {
      setIsCreating(false)
      setShowCreateModal(false)
      setCreateForm({ roomName: '', isPublic: true, password: '', maxPlayers: 10 })
    }
  }

  const handleJoinPublicRoom = async (roomCode) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    setIsJoining(true)

    try {
      const token = Cookies.get('token')
      
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomCode
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push(`/game/${data.gameCode}`)
      } else {
        console.log('Erreur lors de la participation à la room:', data.error)
      }
    } catch (error) {
      console.log('Erreur lors de la participation à la room:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const handleJoinPrivateRoom = async (e) => {
    e.preventDefault()
    if (!joinForm.roomCode.trim()) return

    setIsJoining(true)

    try {
      const token = Cookies.get('token')
      
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomCode: joinForm.roomCode.trim(),
          password: joinForm.password
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push(`/game/${data.gameCode}`)
      } else {
        console.log('Erreur lors de la participation à la room:', data.error)
      }
    } catch (error) {
      console.log('Erreur lors de la participation à la room:', error)
    } finally {
      setIsJoining(false)
      setShowPrivateJoinModal(false)
      setJoinForm({ roomCode: '', password: '' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            LotoJs
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Plateforme de loto moderne
          </p>
        </div>

        {/* Login Button */}
        <div className="flex justify-center mb-8">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = '/auth/login'}
            className="text-lg px-8 py-3"
          >
            Se connecter
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Actions Card */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                Commencer à jouer
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                Créez une nouvelle partie ou rejoignez une partie existante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleCreateParty}
                  disabled={isCreating}
                  className="h-16 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? 'Création...' : 'Créer une nouvelle partie'}
                </Button>
                <Button 
                  onClick={() => setShowPrivateJoinModal(true)}
                  disabled={isJoining}
                  variant="outline"
                  className="h-16 text-lg font-medium border-2 border-gray-300 hover:border-gray-400"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre une partie privée'}
                </Button>
              </div>

              {/* Alert for login requirement */}
              <Alert className="mt-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Connexion requise</strong><br />
                  Pour créer ou rejoindre une partie, vous devez être connecté.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Public Rooms Card */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Rooms publiques disponibles
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Rejoignez une partie publique en cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des rooms...</p>
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Aucune room publique disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publicRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg relative">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{room.name}</h3>
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Publique</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Créée par {room.creator?.name || 'Inconnu'} • Max {room.maxPlayers} joueurs
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Badge de joueurs actifs en temps réel */}
                        <ActivePlayersBadge 
                          roomCode={room.code} 
                          initialCount={room.activePlayerCount || room.playerCount || 0}
                        />
                        
                        <Button
                          onClick={() => handleJoinPublicRoom(room.code)}
                          disabled={isJoining}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Rejoindre
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal pour créer une partie */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Créer une nouvelle partie
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePartySubmit} className="space-y-4">
              <div>
                <Label htmlFor="roomName" className="text-gray-700 dark:text-gray-300">
                  Nom de la partie
                </Label>
                <Input
                  id="roomName"
                  type="text"
                  placeholder="Ex: Partie entre amis"
                  value={createForm.roomName}
                  onChange={(e) => setCreateForm({...createForm, roomName: e.target.value})}
                  className="mt-1"
                  disabled={isCreating}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={createForm.isPublic}
                  onCheckedChange={(checked) => setCreateForm({...createForm, isPublic: checked})}
                  disabled={isCreating}
                />
                <Label htmlFor="isPublic" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {createForm.isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-green-600" />
                      Room publique
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-orange-600" />
                      Room privée
                    </>
                  )}
                </Label>
              </div>
              
              {!createForm.isPublic && (
                <div>
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                    Mot de passe (optionnel)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mot de passe pour la room privée"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="mt-1"
                    disabled={isCreating}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="maxPlayers" className="text-gray-700 dark:text-gray-300">
                  Nombre maximum de joueurs
                </Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  max="20"
                  placeholder="10"
                  value={createForm.maxPlayers}
                  onChange={(e) => setCreateForm({...createForm, maxPlayers: parseInt(e.target.value) || 10})}
                  className="mt-1"
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Entre 2 et 20 joueurs (défaut: 10)
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                  disabled={isCreating}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isCreating}
                >
                  {isCreating ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour rejoindre une room privée */}
      {showPrivateJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-600" />
                Rejoindre une room privée
              </h3>
              <button
                onClick={() => setShowPrivateJoinModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleJoinPrivateRoom} className="space-y-4">
              <div>
                <Label htmlFor="roomCode" className="text-gray-700 dark:text-gray-300">
                  Code de la room (6 chiffres)
                </Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Ex: 123456"
                  value={joinForm.roomCode}
                  onChange={(e) => setJoinForm({...joinForm, roomCode: e.target.value})}
                  className="mt-1"
                  disabled={isJoining}
                  maxLength={6}
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Mot de passe (si requis)
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mot de passe de la room"
                  value={joinForm.password}
                  onChange={(e) => setJoinForm({...joinForm, password: e.target.value})}
                  className="mt-1"
                  disabled={isJoining}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPrivateJoinModal(false)}
                  className="flex-1"
                  disabled={isJoining}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isJoining || !joinForm.roomCode.trim() || joinForm.roomCode.length !== 6}
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
