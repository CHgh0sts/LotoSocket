import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request, { params }) {
  try {
    const { gameId } = await params
    
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ message: 'Token manquant' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return Response.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Vérifier que la room existe et que l'utilisateur en fait partie
    const room = await prisma.room.findUnique({
      where: { code: gameId },
      include: {
        players: true
      }
    })

    if (!room) {
      return Response.json({ message: 'Partie non trouvée' }, { status: 404 })
    }

    const isPlayerInRoom = room.players.some(player => player.id === decoded.userId)
    if (!isPlayerInRoom) {
      return Response.json({ message: 'Accès non autorisé' }, { status: 403 })
    }

    // Récupérer tous les cartons de cette room avec les informations utilisateur et catégorie
    const allCartons = await prisma.carton.findMany({
      where: {
        roomId: room.code
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            activated: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Filtrer les cartons : exclure ceux qui appartiennent à des catégories désactivées
    // Garder les cartons sans catégorie (categoryId === null) et ceux avec catégorie activée
    const cartons = allCartons.filter(carton => {
      // Si le carton n'a pas de catégorie, on le garde
      if (!carton.categoryId || !carton.category) {
        return true
      }
      // Si le carton a une catégorie, on le garde seulement si la catégorie est activée
      return carton.category.activated === true
    })

    return Response.json({
      success: true,
      cartons
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des cartons:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}
