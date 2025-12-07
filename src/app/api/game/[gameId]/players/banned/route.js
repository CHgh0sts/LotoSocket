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

        // Vérifier que la room existe
        const room = await prisma.room.findUnique({
            where: { code: gameId }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room non trouvée' }, { status: 404 })
        }

        // Vérifier que l'utilisateur est le créateur de la room
        if (room.creatorId !== decoded.userId) {
            return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
        }

        // Récupérer les joueurs bannis
        const bans = await prisma.ban.findMany({
            where: { roomId: room.id },
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

        const bannedPlayers = bans.map(ban => ({
            id: ban.user.id,
            name: ban.user.name,
            email: ban.user.email,
            bannedAt: ban.createdAt
        }))

        return NextResponse.json({
            success: true,
            bannedPlayers
        })

    } catch (error) {
        console.log('Erreur lors de la récupération des joueurs bannis:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 