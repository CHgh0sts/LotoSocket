import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request, { params }) {
    try {
        const { gameId } = await params
        const { newCreatorId } = await request.json()
        
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
            where: { code: gameId },
            include: {
                creator: true,
                players: true
            }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room non trouvée' }, { status: 404 })
        }

        // Vérifier que l'utilisateur actuel est le créateur de la room
        if (room.creatorId !== decoded.userId) {
            return NextResponse.json({ success: false, error: 'Seul le créateur peut transférer son rôle' }, { status: 403 })
        }

        // Vérifier que le nouveau créateur existe dans la room
        const newCreator = room.players.find(player => player.id === newCreatorId)
        if (!newCreator) {
            return NextResponse.json({ success: false, error: 'Le joueur sélectionné n\'est pas dans cette room' }, { status: 400 })
        }

        // Vérifier que le nouveau créateur n'est pas le créateur actuel
        if (room.creatorId === newCreatorId) {
            return NextResponse.json({ success: false, error: 'Le joueur sélectionné est déjà le créateur' }, { status: 400 })
        }

        // Transférer le rôle de créateur
        await prisma.room.update({
            where: { id: room.id },
            data: {
                creatorId: newCreatorId
            }
        })

        return NextResponse.json({
            success: true,
            message: `Le rôle de créateur a été transféré à ${newCreator.name}`,
            newCreator: {
                id: newCreator.id,
                name: newCreator.name
            }
        })

    } catch (error) {
        console.log('Erreur lors du transfert du rôle de créateur:', error)
        return NextResponse.json(
            { success: false, error: 'Erreur interne du serveur' },
            { status: 500 }
        )
    }
} 