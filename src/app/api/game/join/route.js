import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { isValidRoomCode } from '@/lib/utils'

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
    const { roomCode, password } = await request.json()

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

    // Trouver la room par son code
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        players: {
          select: {
            id: true,
            name: true,
            email: true
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

    // Vérifier si la room a atteint le nombre maximum de joueurs
    const currentPlayerCount = room.players.length + 1 // +1 pour le créateur
    if (currentPlayerCount >= room.maxPlayers) {
      return NextResponse.json(
        { error: `Cette room a atteint le nombre maximum de joueurs (${room.maxPlayers})` },
        { status: 400 }
      )
    }

    // Vérifier si c'est une room privée et si le mot de passe est correct
    if (!room.isPublic) {
      // Si la room a un mot de passe défini, le vérifier
      if (room.password) {
        if (!password) {
          return NextResponse.json(
            { error: 'Mot de passe requis pour cette room privée' },
            { status: 400 }
          )
        }
        
        if (room.password !== password) {
          return NextResponse.json(
            { error: 'Mot de passe incorrect' },
            { status: 401 }
          )
        }
      }
      // Si la room n'a pas de mot de passe défini, permettre l'accès sans mot de passe
    }

    // Vérifier si l'utilisateur est déjà dans cette room
    const isAlreadyInRoom = room.players.some(player => player.id === user.id)
    
    if (isAlreadyInRoom) {
      return NextResponse.json({
        success: true,
        message: 'Vous êtes déjà dans cette room',
        gameCode: room.code
      })
    }

    // Ajouter l'utilisateur à la room
    await prisma.room.update({
      where: { id: room.id },
      data: {
        players: {
          connect: { id: user.id }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Room rejoint avec succès',
      gameCode: room.code
    })

  } catch (error) {
    console.log('Erreur lors de la participation à la partie:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 