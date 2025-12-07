'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DbTestPage() {
  const [dbStatus, setDbStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testData, setTestData] = useState(null)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/db-test')
      const data = await response.json()
      setDbStatus(data)
    } catch (error) {
      setDbStatus({ error: 'Erreur de connexion', details: error.message })
    } finally {
      setLoading(false)
    }
  }

  const createTestGame = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/db-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createGame',
          data: {
            name: 'Jeu de Test',
            gameType: '1Ligne',
            creatorId: 'test-user-id',
          },
        }),
      })
      const data = await response.json()
      setTestData(data)
    } catch (error) {
      setTestData({ error: 'Erreur lors de la création', details: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Test Base de Données</h1>
        <p className="text-muted-foreground">
          Vérification de la connexion PostgreSQL avec Prisma
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              État de la Connexion
              <Badge variant={dbStatus?.error ? "destructive" : "default"}>
                {dbStatus?.error ? "Erreur" : "Connecté"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Test de la connexion à PostgreSQL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Test en cours..." : "Tester la Connexion"}
            </Button>
            
            {dbStatus && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Résultat :</h4>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(dbStatus, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test de Création</CardTitle>
            <CardDescription>
              Créer un jeu de test dans la base de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createTestGame} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Création..." : "Créer un Jeu de Test"}
            </Button>
            
            {testData && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Résultat :</h4>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testData, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de Configuration</CardTitle>
          <CardDescription>
            Détails de la configuration Prisma et PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Base de données :</strong> PostgreSQL</div>
            <div><strong>ORM :</strong> Prisma</div>
            <div><strong>URL de connexion :</strong> postgresql://postgres:password@localhost:5432/lotosocket</div>
            <div><strong>Schéma :</strong> public</div>
            <div><strong>Tables créées :</strong> users, games, parties, cartons, drawn_numbers</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commandes Utiles</CardTitle>
          <CardDescription>
            Scripts pour gérer la base de données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><code className="bg-muted px-2 py-1 rounded">npm run db:seed</code> - Initialiser avec des données de test</div>
            <div><code className="bg-muted px-2 py-1 rounded">npm run db:reset</code> - Réinitialiser la base de données</div>
            <div><code className="bg-muted px-2 py-1 rounded">npm run db:studio</code> - Ouvrir Prisma Studio</div>
            <div><code className="bg-muted px-2 py-1 rounded">npx prisma migrate dev</code> - Créer une migration</div>
            <div><code className="bg-muted px-2 py-1 rounded">npx prisma generate</code> - Régénérer le client Prisma</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 