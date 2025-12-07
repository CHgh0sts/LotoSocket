import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// API publique pour la grille - pas besoin d'authentification
export async function GET(request, { params }) {
  try {
    const { gameId } = await params

    // Récupérer la room par son code
    const room = await prisma.room.findUnique({
      where: { code: gameId },
      include: {
        creator: {
          select: {
            id: true,
            name: true          
          }
        },
        Party: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        Pubs: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer la partie la plus récente
    const latestParty = room.Party[0]

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        gameType: latestParty?.gameType || '1Ligne',
        listNumbers: latestParty?.listNumbers || [],
        currentNumber: latestParty?.listNumbers?.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0,
        creator: room.creator
      },
      pubs: room.Pubs.map(pub => pub.image)
    })

  } catch (error) {
    console.log('Erreur lors de la récupération de la grille:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

