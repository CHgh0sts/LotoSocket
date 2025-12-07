import { NextResponse } from 'next/server'

// Cette API retourne les compteurs de joueurs connectés
// Note: Dans une implémentation complète, ces données viendraient du serveur WebSocket
export async function GET() {
  try {
    // Pour l'instant, nous retournons des données statiques
    // Dans une implémentation complète, ces données viendraient du serveur WebSocket
    // via une base de données Redis ou un système de cache
    
    return NextResponse.json({
      success: true,
      connectedPlayers: {
        // Exemple de structure
        // "123456": 2, // Room 123456 a 2 joueurs connectés
        // "234567": 1, // Room 234567 a 1 joueur connecté
      }
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des joueurs connectés:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 