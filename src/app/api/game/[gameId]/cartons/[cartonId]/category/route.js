import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(request, { params }) {
  try {
    const { gameId, cartonId } = await params
    const { categoryId } = await request.json()
    
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

    // Vérifier que le carton existe et appartient à cette room
    const carton = await prisma.carton.findUnique({
      where: { id: cartonId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!carton) {
      return Response.json({ message: 'Carton non trouvé' }, { status: 404 })
    }

    if (carton.roomId !== room.code) {
      return Response.json({ message: 'Carton non trouvé dans cette partie' }, { status: 404 })
    }

    // Si une catégorie est spécifiée, vérifier qu'elle existe et appartient à cette room
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!category) {
        return Response.json({ message: 'Catégorie non trouvée' }, { status: 404 })
      }

      if (category.roomId !== room.id) {
        return Response.json({ message: 'Catégorie non trouvée dans cette partie' }, { status: 404 })
      }
    }

    // Mettre à jour la catégorie du carton
    const updatedCarton = await prisma.carton.update({
      where: { id: cartonId },
      data: {
        categoryId: categoryId || null
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
            name: true
          }
        }
      }
    })

    return Response.json({
      success: true,
      carton: updatedCarton,
      message: categoryId ? 'Carton assigné à la catégorie' : 'Carton retiré de toute catégorie'
    })

  } catch (error) {
    console.log('Erreur lors de la mise à jour de la catégorie du carton:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}

