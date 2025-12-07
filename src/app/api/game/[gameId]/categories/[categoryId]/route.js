import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(request, { params }) {
  try {
    const { gameId, categoryId } = await params
    const { activated } = await request.json()
    
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

    // Vérifier que la catégorie existe et appartient à cette room
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return Response.json({ message: 'Catégorie non trouvée' }, { status: 404 })
    }

    if (category.roomId !== room.id) {
      return Response.json({ message: 'Catégorie non trouvée dans cette partie' }, { status: 404 })
    }

    // Mettre à jour le statut activé/désactivé
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        activated: activated !== undefined ? activated : category.activated
      }
    })

    return Response.json({
      success: true,
      category: updatedCategory,
      message: activated ? 'Catégorie activée' : 'Catégorie désactivée'
    })

  } catch (error) {
    console.log('Erreur lors de la mise à jour de la catégorie:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { gameId, categoryId } = await params
    
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

    // Vérifier que la catégorie existe et appartient à cette room
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        cartons: true
      }
    })

    if (!category) {
      return Response.json({ message: 'Catégorie non trouvée' }, { status: 404 })
    }

    if (category.roomId !== room.id) {
      return Response.json({ message: 'Catégorie non trouvée dans cette partie' }, { status: 404 })
    }

    // Supprimer la catégorie (les cartons associés auront leur categoryId mis à null grâce au onDelete: Cascade)
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return Response.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    })

  } catch (error) {
    console.log('Erreur lors de la suppression de la catégorie:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}
