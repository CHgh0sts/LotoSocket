import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Récupérer toutes les rooms publiques actives
    const publicRooms = await prisma.room.findMany({
      where: {
        isPublic: true,
        isActive: true
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        },
        players: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Pour chaque room, nous devons compter les joueurs actuellement connectés
    // Note: Cette information devrait idéalement venir du serveur WebSocket
    // Pour l'instant, nous retournons le nombre total de joueurs
    // TODO: Implémenter un système pour suivre les connexions actives

    const roomsWithActivePlayers = publicRooms.map(room => ({
      id: room.id,
      code: room.code,
      name: room.name,
      isPublic: room.isPublic,
      createdAt: room.createdAt,
      creator: room.creator,
      totalPlayers: room.players.length,
      activePlayers: room.players.length, // Temporairement égal au total
      players: room.players
    }))

    return NextResponse.json({
      success: true,
      rooms: roomsWithActivePlayers
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des joueurs actifs:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 