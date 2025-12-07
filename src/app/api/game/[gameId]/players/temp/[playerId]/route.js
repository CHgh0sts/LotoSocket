import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function DELETE(request, { params }) {
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
            return NextResponse.json({ success: false, error: 'Seul le créateur peut supprimer des joueurs' }, { status: 403 })
        }

        // Vérifier que le joueur existe et est temporaire
        const player = await prisma.user.findUnique({
            where: { id: playerId }
        })

        if (!player) {
            return NextResponse.json({ success: false, error: 'Joueur non trouvé' }, { status: 404 })
        }

        if (!player.tempCreateRoom) {
            return NextResponse.json({ success: false, error: 'Ce joueur n\'est pas temporaire' }, { status: 400 })
        }

        // Supprimer le joueur temporaire
        await prisma.user.delete({
            where: { id: playerId }
        })

        return NextResponse.json({
            success: true,
            message: 'Joueur temporaire supprimé'
        })

    } catch (error) {
        console.log('Erreur lors de la suppression du joueur temporaire:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 