import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Rechercher l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier si le compte est vérifié (sauf en mode développement)
    if (!user.emailVerified && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Veuillez vérifier votre email avant de vous connecter' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer le token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json({
      success: true,
      token,
      user: userData
    })

  } catch (error) {
    console.log('Erreur lors de la connexion:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 