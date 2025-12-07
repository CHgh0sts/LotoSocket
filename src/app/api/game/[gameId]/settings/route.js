import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(request, { params }) {
  try {
    const { gameId } = await params
    const { isPrivate, password } = await request.json()
    
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
      where: { code: gameId },
      include: {
        creator: true
      }
    })

    if (!room) {
      return Response.json({ message: 'Partie non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le créateur de la room
    if (room.creator.id !== decoded.userId) {
      return Response.json({ 
        message: 'Seul le créateur de la partie peut modifier ces paramètres' 
      }, { status: 403 })
    }

    // Mettre à jour les paramètres de la room
    const updatedRoom = await prisma.room.update({
      where: { code: gameId },
      data: {
        isPublic: !isPrivate, // Inverser la logique car le schéma utilise isPublic
        password: isPrivate && password ? password : null
      },
      include: {
        creator: true,
        players: true
      }
    })

    return Response.json({
      success: true,
      room: {
        code: updatedRoom.code,
        name: updatedRoom.name,
        isPrivate: !updatedRoom.isPublic, // Inverser pour correspondre à l'interface
        hasPassword: !!updatedRoom.password,
        creator: {
          id: updatedRoom.creator.id,
          name: updatedRoom.creator.name,
          email: updatedRoom.creator.email
        },
        participants: updatedRoom.players.length
      }
    })

  } catch (error) {
    console.log('Erreur lors de la mise à jour des paramètres:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}
