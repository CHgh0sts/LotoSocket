import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Récupérer toutes les pubs d'une room
export async function GET(request, { params }) {
  try {
    const { gameId } = await params

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    try {
      jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 })
    }

    // Récupérer la room par son code
    const room = await prisma.room.findUnique({
      where: { code: gameId },
      include: {
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

    return NextResponse.json({
      success: true,
      pubs: room.Pubs.map(pub => pub.image)
    })

  } catch (error) {
    console.log('Erreur lors de la récupération des pubs:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Sauvegarder les pubs d'une room (remplace toutes les pubs existantes)
export async function PUT(request, { params }) {
  try {
    const { gameId } = await params
    const body = await request.json()
    const { pubs } = body

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
      where: { code: gameId }
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est le créateur de la room
    if (room.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Seul le créateur peut modifier les publicités' },
        { status: 403 }
      )
    }

    // Supprimer toutes les pubs existantes
    await prisma.pub.deleteMany({
      where: { roomId: room.id }
    })

    // Créer les nouvelles pubs
    if (pubs && pubs.length > 0) {
      await prisma.pub.createMany({
        data: pubs.map((image, index) => ({
          image,
          order: index,
          roomId: room.id
        }))
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Publicités sauvegardées'
    })

  } catch (error) {
    console.log('Erreur lors de la sauvegarde des pubs:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Ajouter une pub
export async function POST(request, { params }) {
  try {
    const { gameId } = await params
    const body = await request.json()
    const { image } = body

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
      where: { code: gameId }
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est le créateur de la room
    if (room.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Seul le créateur peut ajouter des publicités' },
        { status: 403 }
      )
    }

    // Compter les pubs existantes pour l'ordre
    const pubCount = await prisma.pub.count({
      where: { roomId: room.id }
    })

    // Créer la nouvelle pub
    const pub = await prisma.pub.create({
      data: {
        image,
        order: pubCount,
        roomId: room.id
      }
    })

    return NextResponse.json({
      success: true,
      pub: { id: pub.id, image: pub.image }
    })

  } catch (error) {
    console.log('Erreur lors de l\'ajout de la pub:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

