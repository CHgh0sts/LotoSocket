import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { generateRoomCode } from '@/lib/utils'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request) {
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
    const { gameType = '1Ligne', roomName, isPublic = true, password, maxPlayers = 10 } = await request.json()

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Générer un code unique pour la room
    let roomCode
    let room
    let attempts = 0
    const maxAttempts = 10

    do {
      roomCode = generateRoomCode()
      attempts++
      
      // Vérifier si le code existe déjà
      const existingRoom = await prisma.room.findUnique({
        where: { code: roomCode }
      })
      
      if (!existingRoom) {
        // Créer une nouvelle room avec le code unique
        room = await prisma.room.create({
          data: {
            code: roomCode,
            name: roomName || `Partie de ${user.name}`,
            isActive: true,
            isPublic,
            password: !isPublic && password ? password : null,
            maxPlayers,
            creatorId: user.id,
            players: {
              connect: { id: user.id }
            }
          }
        })
        break
      }
    } while (attempts < maxAttempts)

    if (!room) {
      return NextResponse.json(
        { error: 'Impossible de générer un code unique pour la room' },
        { status: 500 }
      )
    }

    // Créer une nouvelle partie liée à cette room
    const party = await prisma.party.create({
      data: {
        gameType,
        roomId: room.id,
        listNumbers: []
      }
    })

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        isActive: room.isActive,
        creatorId: room.creatorId,
        createdAt: room.createdAt
      },
      party: {
        id: party.id,
        gameType: party.gameType,
        roomId: party.roomId,
        listNumbers: party.listNumbers,
        createdAt: party.createdAt
      },
      gameCode: room.code // Retourner le code pour l'URL
    })

  } catch (error) {
    console.log('Erreur lors de la création de la partie:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 