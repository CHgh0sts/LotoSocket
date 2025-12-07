import { NextResponse } from 'next/server'
import { dbUtils, gameOperations, userOperations } from '@/lib/db'

export async function GET() {
  try {
    // Tester la connexion
    const isConnected = await dbUtils.checkConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Impossible de se connecter à la base de données' },
        { status: 500 }
      )
    }

    // Compter les enregistrements dans chaque table
    const stats = {
      users: await userOperations.getUserCount?.() || 0,
      games: await gameOperations.getGameCount?.() || 0,
      // Ajouter d'autres statistiques si nécessaire
    }

    return NextResponse.json({
      message: 'Connexion à la base de données réussie',
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.log('Erreur lors du test de la base de données:', error)
    return NextResponse.json(
      { error: 'Erreur lors du test de la base de données', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'createGame':
        const game = await gameOperations.createGame(data)
        return NextResponse.json({ success: true, game })

      case 'createUser':
        const user = await userOperations.createUser(data)
        return NextResponse.json({ success: true, user })

      default:
        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.log('Erreur lors de l\'opération:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'opération', details: error.message },
      { status: 500 }
    )
  }
} 