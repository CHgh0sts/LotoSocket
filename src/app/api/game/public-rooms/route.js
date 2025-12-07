import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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
        },
        _count: {
          select: {
            players: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Pour chaque room, compter les sessions actives
    const roomsWithActivePlayers = await Promise.all(
      publicRooms.map(async (room) => {
        // Compter les sessions actives pour cette room
        const activeSessions = await prisma.activeSession.count({
          where: {
            roomCode: room.code,
            isActive: true
          }
        });

        return {
          id: room.id,
          code: room.code,
          name: room.name,
          isPublic: room.isPublic,
          createdAt: room.createdAt,
          creator: room.creator,
          playerCount: room._count.players, // Nombre total de joueurs
          activePlayerCount: activeSessions, // Nombre de joueurs actuellement connectés
          maxPlayers: room.maxPlayers, // Nombre maximum de joueurs
          players: room.players
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      rooms: roomsWithActivePlayers
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des rooms publiques:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 