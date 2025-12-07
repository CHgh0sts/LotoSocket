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

        // Vérifier que l'utilisateur est le créateur de la room
        if (room.creatorId !== decoded.userId) {
            return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
        }

        // Vérifier que le joueur existe
        const player = await prisma.user.findUnique({
            where: { id: playerId }
        })

        if (!player) {
            return NextResponse.json({ success: false, error: 'Joueur non trouvé' }, { status: 404 })
        }

        // Supprimer le bannissement
        await prisma.ban.deleteMany({
            where: {
                userId: playerId,
                roomId: room.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Joueur débanni avec succès'
        })

    } catch (error) {
        console.log('Erreur lors du débannissement:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 