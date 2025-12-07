import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function GET(request, { params }) {
  try {
    const { gameId } = await params

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 })
    }

    const userId = decoded.userId

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
        players: {
          select: {
            id: true,
            name: true
          }
        },
        Party: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        Cartons: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
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

    // Vérifier si l'utilisateur est banni de cette room
    const ban = await prisma.ban.findUnique({
      where: {
        userId_roomId: {
          userId: userId,
          roomId: room.id
        }
      }
    })

    if (ban) {
      return NextResponse.json(
        { success: false, error: 'Vous êtes banni de cette room' },
        { status: 403 }
      )
    }

    // Si pas de parties, en créer une par défaut
    if (!room.Party || room.Party.length === 0) {
      const party = await prisma.party.create({
        data: { 
          roomId: room.id,
          gameType: '1Ligne',
          listNumbers: []
        }
      })
      room.Party = [party]
    }

    // Récupérer la partie la plus récente
    const latestParty = room.Party[0]

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        isPublic: room.isPublic,
        code: room.code,
        name: room.name,
        gameType: latestParty.gameType,
        currentNumber: latestParty.listNumbers.length > 0 ? latestParty.listNumbers[latestParty.listNumbers.length - 1] : 0,
        isActive: room.isActive,
        creator: room.creator,
        Party: room.Party,
        Cartons: room.Cartons
      }
    })

  } catch (error) {
    console.log('Erreur lors de la récupération de la partie:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 