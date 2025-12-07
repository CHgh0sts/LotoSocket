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

        // Trouver la room par son code
        const room = await prisma.room.findUnique({
            where: { code: gameId },
            include: {
                creator: true,
                players: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        tempCreateRoom: true
                    }
                },
                Cartons: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                tempCreateRoom: true
                            }
                        },
                        category: {
                            select: {
                                id: true,
                                name: true,
                                activated: true
                            }
                        }
                    }
                }
            }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room non trouvée' }, { status: 404 })
        }

        // Extraire les joueurs uniques avec leur statut
        const playersMap = new Map()
        
        // Ajouter le créateur
        playersMap.set(room.creator.id, {
            id: room.creator.id,
            name: room.creator.name,
            email: room.creator.email,
            tempCreateRoom: room.creator.tempCreateRoom,
            isCreator: true
        })

        // Ajouter tous les joueurs de la room
        room.players.forEach(player => {
            if (!playersMap.has(player.id)) {
                playersMap.set(player.id, {
                    id: player.id,
                    name: player.name,
                    email: player.email,
                    tempCreateRoom: player.tempCreateRoom,
                    isCreator: false
                })
            }
        })

        // Ajouter les joueurs qui ont des cartons (pour les anciens joueurs)
        room.Cartons.forEach(carton => {
            if (!playersMap.has(carton.user.id)) {
                playersMap.set(carton.user.id, {
                    id: carton.user.id,
                    name: carton.user.name,
                    email: carton.user.email,
                    tempCreateRoom: carton.user.tempCreateRoom,
                    isCreator: false
                })
            }
        })

        // Récupérer les joueurs bannis pour les exclure
        const bans = await prisma.ban.findMany({
            where: { roomId: room.id },
            select: { userId: true }
        })

        const bannedUserIds = bans.map(ban => ban.userId)

        // Filtrer les joueurs bannis
        const players = Array.from(playersMap.values()).filter(player => 
            !bannedUserIds.includes(player.id)
        )

        // Formater les cartons en excluant ceux des catégories désactivées
        // Garder les cartons sans catégorie (categoryId === null) et ceux avec catégorie activée
        const cartons = room.Cartons
            .filter(carton => {
                // Si le carton n'a pas de catégorie, on le garde
                if (!carton.categoryId || !carton.category) {
                    return true
                }
                // Si le carton a une catégorie, on le garde seulement si la catégorie est activée
                return carton.category.activated === true
            })
            .map(carton => ({
                id: carton.id,
                numbers: carton.numbers,
                userId: carton.userId,
                categoryId: carton.categoryId,
                createdAt: carton.createdAt
            }))

        return NextResponse.json({
            success: true,
            players,
            cartons
        })

    } catch (error) {
        console.log('Erreur lors de la récupération des joueurs:', error)
        return NextResponse.json({ 
            success: false, 
            error: 'Erreur serveur' 
        }, { status: 500 })
    }
} 