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

    // Récupérer les catégories de cette room
    const categories = await prisma.category.findMany({
      where: {
        roomId: room.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return Response.json({
      success: true,
      categories
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des catégories:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { gameId } = await params
    const { name } = await request.json()
    
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

    // Validation
    if (!name || name.trim().length === 0) {
      return Response.json({ message: 'Le nom de la catégorie est requis' }, { status: 400 })
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

    // Vérifier que la catégorie n'existe pas déjà
    const existingCategory = await prisma.category.findFirst({
      where: {
        roomId: room.id,
        name: name.trim()
      }
    })

    if (existingCategory) {
      return Response.json({ 
        message: 'Une catégorie avec ce nom existe déjà' 
      }, { status: 400 })
    }

    // Créer la catégorie
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        roomId: room.id,
        global: false,
        activated: true
      }
    })

    return Response.json({
      success: true,
      category
    })

  } catch (error) {
    console.log('Erreur lors de la création de la catégorie:', error)
    return Response.json({ 
      message: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}
