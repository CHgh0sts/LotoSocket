'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { useClientValue, useWindowLocation } from '@/hooks/useClientValue'
import { useSocketClient } from '@/hooks/socketClient'

export default function HooksPage() {
  const isMobile = useIsMobile()
  const clientValue = useClientValue('Server Value', 'Client Value')
  const windowLocation = useWindowLocation()
  const socket = useSocketClient()

  const [demoMessage, setDemoMessage] = useState('')
  const [demoEvent, setDemoEvent] = useState('message')
  const [receivedMessages, setReceivedMessages] = useState([])

  // Écouter les messages avec .on()
  useEffect(() => {
    if (socket.socket) {
      socket.on('message', (data) => {
        setReceivedMessages(prev => [...prev, { event: 'message', data, timestamp: new Date().toLocaleTimeString() }])
      })

      socket.on('notification', (data) => {
        setReceivedMessages(prev => [...prev, { event: 'notification', data, timestamp: new Date().toLocaleTimeString() }])
      })

      socket.on('game_update', (data) => {
        setReceivedMessages(prev => [...prev, { event: 'game_update', data, timestamp: new Date().toLocaleTimeString() }])
      })

      // Nettoyage
      return () => {
        socket.off('message')
        socket.off('notification')
        socket.off('game_update')
      }
    }
  }, [socket.socket, socket.on, socket.off])

  const handleSendMessage = () => {
    if (demoMessage.trim() && demoEvent.trim()) {
      socket.sendMessage(demoEvent, demoMessage)
      setDemoMessage('')
    }
  }

  const clearMessages = () => {
    setReceivedMessages([])
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Hooks Documentation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Documentation complète de tous les hooks personnalisés disponibles dans ce projet.
          Chaque hook est conçu pour résoudre des problèmes spécifiques et améliorer la réutilisabilité du code.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="ui">UI</TabsTrigger>
          <TabsTrigger value="data">Données</TabsTrigger>
          <TabsTrigger value="network">Réseau</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* useIsMobile Hook */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    useIsMobile
                    <Badge variant="secondary">UI</Badge>
                  </CardTitle>
                  <CardDescription>
                    Hook pour détecter si l'utilisateur est sur un appareil mobile
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant={isMobile ? "destructive" : "default"}>
                    {isMobile ? "Mobile" : "Desktop"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Utilisation :</h4>
                <pre className="text-sm">
{`import { useIsMobile } from '@/hooks/use-mobile'

function MyComponent() {
  const isMobile = useIsMobile()
  
  return (
    <div>
      {isMobile ? 'Vue mobile' : 'Vue desktop'}
    </div>
  )
}`}
                </pre>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Fonctionnalités :</h4>
                <ul className="text-sm space-y-1">
                  <li>• Détection automatique de la taille d'écran</li>
                  <li>• Breakpoint configurable (768px par défaut)</li>
                  <li>• Mise à jour en temps réel lors du redimensionnement</li>
                  <li>• Gestion des événements de media query</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* useClientValue Hook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useClientValue
                <Badge variant="outline">Data</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour gérer les valeurs côté client vs serveur avec hydratation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Valeur actuelle :</h4>
                <Badge variant="secondary">{clientValue}</Badge>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Utilisation :</h4>
                <pre className="text-sm">
{`import { useClientValue } from '@/hooks/useClientValue'

function MyComponent() {
  const value = useClientValue('Server Value', 'Client Value')
  
  return <div>{value}</div>
}`}
                </pre>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Fonctionnalités :</h4>
                <ul className="text-sm space-y-1">
                  <li>• Évite l'erreur d'hydratation Next.js</li>
                  <li>• Gestion automatique client/serveur</li>
                  <li>• Transition fluide entre les valeurs</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* useWindowLocation Hook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useWindowLocation
                <Badge variant="outline">Data</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour accéder aux informations de localisation de la fenêtre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Informations actuelles :</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Origin:</strong> {windowLocation.origin}</div>
                  <div><strong>Hostname:</strong> {windowLocation.hostname}</div>
                  <div><strong>Port:</strong> {windowLocation.port}</div>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Utilisation :</h4>
                <pre className="text-sm">
{`import { useWindowLocation } from '@/hooks/useClientValue'

function MyComponent() {
  const location = useWindowLocation()
  
  return (
    <div>
      <p>Origin: {location.origin}</p>
      <p>Hostname: {location.hostname}</p>
    </div>
  )
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* useSocketClient Hook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useSocketClient
                <Badge variant="destructive">Network</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour gérer les connexions Socket.IO avec gestion d'état complète
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={socket.isConnected ? "default" : "destructive"}>
                  {socket.isConnected ? "Connecté" : "Déconnecté"}
                </Badge>
                <Button 
                  onClick={socket.isConnected ? socket.disconnect : socket.connect}
                  variant={socket.isConnected ? "destructive" : "default"}
                  size="sm"
                >
                  {socket.isConnected ? "Déconnecter" : "Connecter"}
                </Button>
              </div>

              {socket.error && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-destructive mb-2">Erreur :</h4>
                  <p className="text-sm">{socket.error.toString()}</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-semibold">Envoyer un message :</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={demoEvent}
                    onChange={(e) => setDemoEvent(e.target.value)}
                    placeholder="Événement..."
                    className="w-32 px-3 py-2 border rounded-md"
                  />
                  <input
                    type="text"
                    value={demoMessage}
                    onChange={(e) => setDemoMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1 px-3 py-2 border rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!socket.isConnected || !demoMessage.trim() || !demoEvent.trim()}
                    size="sm"
                  >
                    Envoyer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Messages reçus :</h4>
                  <Button onClick={clearMessages} size="sm" variant="outline">
                    Effacer
                  </Button>
                </div>
                <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
                  {receivedMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun message reçu</p>
                  ) : (
                    <div className="space-y-2">
                      {receivedMessages.map((msg, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-semibold text-blue-600">[{msg.event}]</span>
                          <span className="text-muted-foreground ml-2">{msg.timestamp}</span>
                          <div className="mt-1">{JSON.stringify(msg.data)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Utilisation avec .on() :</h4>
                <pre className="text-sm">
{`import { useSocketClient } from '@/hooks/socketClient'

function MyComponent() {
  const socket = useSocketClient('http://localhost:3000')
  
  useEffect(() => {
    if (socket.socket) {
      // Écouter un événement spécifique
      socket.on('message', (data) => {
        console.log('Message reçu:', data)
      })
      
      // Écouter plusieurs événements
      socket.on('notification', (data) => {
        console.log('Notification:', data)
      })
      
      // Nettoyage
      return () => {
        socket.off('message')
        socket.off('notification')
      }
    }
  }, [socket.socket, socket.on, socket.off])
  
  const handleSend = () => {
    socket.sendMessage('message', { text: 'Hello!' })
  }
  
  return (
    <div>
      <p>Status: {socket.isConnected ? 'Connecté' : 'Déconnecté'}</p>
      <button onClick={socket.connect}>Connecter</button>
      <button onClick={handleSend}>Envoyer</button>
    </div>
  )
}`}
                </pre>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Fonctionnalités :</h4>
                <ul className="text-sm space-y-1">
                  <li>• Connexion/déconnexion automatique</li>
                  <li>• Support de la syntaxe .on() et .off()</li>
                  <li>• Gestion des erreurs</li>
                  <li>• Événements personnalisés</li>
                  <li>• Nettoyage automatique à la destruction</li>
                  <li>• État de connexion en temps réel</li>
                  <li>• Support WebSocket et polling</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useIsMobile
                <Badge variant="secondary">UI</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour détecter si l'utilisateur est sur un appareil mobile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">État actuel :</h4>
                <Badge variant={isMobile ? "destructive" : "default"}>
                  {isMobile ? "Mobile" : "Desktop"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useClientValue
                <Badge variant="outline">Data</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour gérer les valeurs côté client vs serveur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Valeur actuelle :</h4>
                <Badge variant="secondary">{clientValue}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useWindowLocation
                <Badge variant="outline">Data</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour accéder aux informations de localisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Informations :</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Origin:</strong> {windowLocation.origin}</div>
                  <div><strong>Hostname:</strong> {windowLocation.hostname}</div>
                  <div><strong>Port:</strong> {windowLocation.port}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                useSocketClient
                <Badge variant="destructive">Network</Badge>
              </CardTitle>
              <CardDescription>
                Hook pour gérer les connexions Socket.IO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant={socket.isConnected ? "default" : "destructive"}>
                  {socket.isConnected ? "Connecté" : "Déconnecté"}
                </Badge>
                <Button 
                  onClick={socket.isConnected ? socket.disconnect : socket.connect}
                  variant={socket.isConnected ? "destructive" : "default"}
                  size="sm"
                >
                  {socket.isConnected ? "Déconnecter" : "Connecter"}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Messages reçus :</h4>
                <div className="bg-muted p-4 rounded-lg max-h-32 overflow-y-auto">
                  {receivedMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun message reçu</p>
                  ) : (
                    <div className="space-y-1">
                      {receivedMessages.slice(-5).map((msg, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-semibold text-blue-600">[{msg.event}]</span>
                          <span className="text-muted-foreground ml-2">{msg.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 