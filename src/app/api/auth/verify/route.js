import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token de vérification requis' },
        { status: 400 }
      )
    }

    // Rechercher l'utilisateur avec ce token de vérification
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerified: false
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token de vérification invalide ou déjà utilisé' },
        { status: 400 }
      )
    }

    // Vérifier l'utilisateur et supprimer le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.'
    })

  } catch (error) {
    console.log('Erreur lors de la vérification de l\'email:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 