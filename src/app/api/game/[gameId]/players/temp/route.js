import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request, { params }) {
    try {
        const { gameId } = await params
        const { name } = await request.json()
        
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
            return NextResponse.json({ success: false, error: 'Seul le créateur peut créer des joueurs temporaires' }, { status: 403 })
        }

        // Créer un profil temporaire
        const tempUser = await prisma.user.create({
            data: {
                name: name,
                tempCreateRoom: room.id, // Lier à cette room
                email: null, // Pas d'email pour les profils temporaires
                password: null // Pas de mot de passe
            }
        })

        // Ajouter l'utilisateur temporaire à la room
        await prisma.room.update({
            where: { id: room.id },
            data: {
                players: {
                    connect: { id: tempUser.id }
                }
            }
        })

        return NextResponse.json({
            success: true,
            user: {
                id: tempUser.id,
                name: tempUser.name,
                tempCreateRoom: tempUser.tempCreateRoom,
                isCreator: false
            }
        })

    } catch (error) {
        console.log('Erreur lors de la création du profil temporaire:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 