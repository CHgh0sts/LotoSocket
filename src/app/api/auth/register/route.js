import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const { name, email, password } = await request.json()

    // Validation des données
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerified: false
      }
    })

    // Envoyer l'email de vérification (simulation pour l'instant)
    // Dans un vrai projet, vous utiliseriez un service d'email comme SendGrid, Mailgun, etc.
    console.log('Email de vérification à envoyer:', {
      to: user.email,
      token: verificationToken,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${verificationToken}`
    })

    // En mode développement, on marque automatiquement l'email comme vérifié
    if (process.env.NODE_ENV === 'development') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null
        }
      })
    }

    // Pour l'instant, on simule l'envoi d'email
    const emailSent = process.env.NODE_ENV === 'production'

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Inscription réussie ! Vérifiez votre email pour activer votre compte.'
        : 'Inscription réussie ! En mode développement, vous pouvez vous connecter directement.',
      emailSent,
      userId: user.id
    })

  } catch (error) {
    console.log('Erreur lors de l\'inscription:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 