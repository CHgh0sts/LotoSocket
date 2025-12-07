import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request, { params }) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Enlever 'Bearer '

    // Vérifier le token JWT
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    // Récupérer les données de la requête
    const { playerId, listNumbers } = await request.json()
    const { gameId } = await params

    if (!playerId || !listNumbers) {
      return NextResponse.json(
        { error: 'playerId et listNumbers sont requis' },
        { status: 400 }
      )
    }

    // Valider que listNumbers est un tableau de 27 éléments
    if (!Array.isArray(listNumbers) || listNumbers.length !== 27) {
      return NextResponse.json(
        { error: 'listNumbers doit être un tableau de 27 éléments' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur connecté
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que la room existe et que l'utilisateur est le créateur
    const room = await prisma.room.findUnique({
      where: { code: gameId },
      include: {
        creator: true,
        players: true
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions :
    // - Le créateur peut ajouter des cartons à n'importe qui
    // - Les autres joueurs peuvent seulement ajouter des cartons à eux-mêmes
    const isCreator = room.creator.id === currentUser.id
    const isAddingToSelf = playerId === currentUser.id
    
    if (!isCreator && !isAddingToSelf) {
      return NextResponse.json(
        { error: 'Vous ne pouvez ajouter des cartons qu\'à vous-même, seul le créateur peut ajouter des cartons aux autres joueurs' },
        { status: 403 }
      )
    }

    // Vérifier que le joueur cible existe et fait partie de la room
    const targetPlayer = await prisma.user.findUnique({
      where: { id: playerId }
    })

    if (!targetPlayer) {
      return NextResponse.json(
        { error: 'Joueur cible non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le joueur cible fait partie de la room (créateur ou joueur)
    const isPlayerInRoom = room.creator.id === playerId || 
                          room.players.some(player => player.id === playerId)

    if (!isPlayerInRoom) {
      return NextResponse.json(
        { error: 'Le joueur cible ne fait pas partie de cette room' },
        { status: 400 }
      )
    }

    // Convertir les nombres du carton en entiers, en remplaçant '*' par 0
    const numbersAsInts = listNumbers.map(num => {
      if (num === '*' || num === '' || num === null || num === undefined) {
        return 0 // Utiliser 0 pour représenter les cases vides
      }
      return parseInt(num, 10)
    })

    // Créer le carton en base de données
    const newCarton = await prisma.carton.create({
      data: {
        userId: playerId,
        roomId: room.code, // Utiliser le code de la room (pas l'ID)
        numbers: numbersAsInts
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Carton ajouté avec succès',
      carton: {
        id: newCarton.id,
        playerId: newCarton.user.id,
        playerName: newCarton.user.name,
        numbers: newCarton.numbers,
        createdAt: newCarton.createdAt
      }
    })

  } catch (error) {
    console.log('Erreur lors de l\'ajout du carton:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}