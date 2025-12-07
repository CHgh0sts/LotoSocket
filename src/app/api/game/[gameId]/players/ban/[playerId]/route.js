import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request, { params }) {
    try {
        const { gameId, playerId } = await params
        
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

        // Vérifier que la room existe
        const room = await prisma.room.findUnique({
            where: { code: gameId }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room non trouvée' }, { status: 404 })
        }

        // Vérifier que le joueur existe
        const player = await prisma.user.findUnique({
            where: { id: playerId }
        })

        if (!player) {
            return NextResponse.json({ success: false, error: 'Joueur non trouvé' }, { status: 404 })
        }

        // Vérifier que l'utilisateur est le créateur de la room
        if (room.creatorId !== decoded.userId) {
            return NextResponse.json({ success: false, error: 'Seul le créateur peut bannir des joueurs' }, { status: 403 })
        }

        // Vérifier que le joueur n'est pas le créateur de la room
        if (room.creatorId === playerId) {
            return NextResponse.json({ success: false, error: 'Impossible de bannir le créateur de la room' }, { status: 400 })
        }

        // Empêcher qu'un utilisateur se bannisse lui-même
        if (decoded.userId === playerId) {
            return NextResponse.json({ success: false, error: 'Vous ne pouvez pas vous bannir vous-même' }, { status: 400 })
        }

        // Créer le bannissement
        await prisma.ban.create({
            data: {
                userId: playerId,
                roomId: room.id
            }
        })

        // Retirer le joueur de la room
        await prisma.room.update({
            where: { id: room.id },
            data: {
                players: {
                    disconnect: { id: playerId }
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Joueur banni de la room',
            bannedPlayerId: playerId,
            roomCode: gameId
        })

    } catch (error) {
        console.log('Erreur lors du bannissement:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 