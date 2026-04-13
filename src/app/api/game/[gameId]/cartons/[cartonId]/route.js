import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Modifier un carton
export async function PUT(request, { params }) {
  try {
    const { gameId, cartonId } = await params
    const { listNumbers } = await request.json()

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

    if (!Array.isArray(listNumbers) || listNumbers.length !== 27) {
      return Response.json({ message: 'listNumbers doit être un tableau de 27 éléments' }, { status: 400 })
    }

    // Vérifier que la room existe
    const room = await prisma.room.findUnique({
      where: { code: gameId }
    })

    if (!room) {
      return Response.json({ message: 'Partie non trouvée' }, { status: 404 })
    }

    // Vérifier que le carton existe
    const carton = await prisma.carton.findUnique({
      where: { id: cartonId }
    })

    if (!carton) {
      return Response.json({ message: 'Carton non trouvé' }, { status: 404 })
    }

    // Vérifier les permissions
    const isCreator = room.creatorId === decoded.userId
    const isOwner = carton.userId === decoded.userId

    if (!isCreator && !isOwner) {
      return Response.json({ message: 'Vous n\'êtes pas autorisé à modifier ce carton' }, { status: 403 })
    }

    // Convertir les nombres
    const numbersAsInts = listNumbers.map(num => {
      if (num === '*' || num === '' || num === null || num === undefined) {
        return 0
      }
      return parseInt(num, 10)
    })

    // Mettre à jour le carton
    const updatedCarton = await prisma.carton.update({
      where: { id: cartonId },
      data: { numbers: numbersAsInts },
      include: {
        user: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, activated: true }
        }
      }
    })

    return Response.json({
      success: true,
      message: 'Carton modifié avec succès',
      carton: updatedCarton
    })

  } catch (error) {
    console.log('Erreur lors de la modification du carton:', error)
    return Response.json({ message: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// Supprimer un carton
export async function DELETE(request, { params }) {
  try {
    const { gameId, cartonId } = await params

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

    // Vérifier que la room existe
    const room = await prisma.room.findUnique({
      where: { code: gameId }
    })

    if (!room) {
      return Response.json({ message: 'Partie non trouvée' }, { status: 404 })
    }

    // Vérifier que le carton existe
    const carton = await prisma.carton.findUnique({
      where: { id: cartonId }
    })

    if (!carton) {
      return Response.json({ message: 'Carton non trouvé' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le créateur de la room ou le propriétaire du carton
    const isCreator = room.creatorId === decoded.userId
    const isOwner = carton.userId === decoded.userId

    if (!isCreator && !isOwner) {
      return Response.json({ message: 'Vous n\'êtes pas autorisé à supprimer ce carton' }, { status: 403 })
    }

    // Supprimer le carton
    await prisma.carton.delete({
      where: { id: cartonId }
    })

    return Response.json({
      success: true,
      message: 'Carton supprimé avec succès'
    })

  } catch (error) {
    console.log('Erreur lors de la suppression du carton:', error)
    return Response.json({
      message: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
