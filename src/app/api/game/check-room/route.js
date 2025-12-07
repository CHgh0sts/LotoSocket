import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { isValidRoomCode } from '@/lib/utils'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    // Récupérer les données de la requête
    const { roomCode } = await request.json()

    if (!roomCode) {
      return NextResponse.json(
        { error: 'Code de room requis' },
        { status: 400 }
      )
    }

    // Valider le format du code (6 chiffres)
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        { error: 'Le code doit contenir exactement 6 chiffres' },
        { status: 400 }
      )
    }

    // Trouver la room par son code
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            players: true
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room non trouvée' },
        { status: 404 }
      )
    }

    if (!room.isActive) {
      return NextResponse.json(
        { error: 'Cette room n\'est plus active' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        isPublic: room.isPublic,
        hasPassword: !!room.password,
        creator: room.creator,
        playerCount: room._count.players,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt
      }
    })

  } catch (error) {
    console.log('Erreur lors de la vérification de la room:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 