import { NextResponse } from 'next/server'

export function isPrismaDatabaseUnavailable(error) {
  if (!error || typeof error !== 'object') return false
  const name = error.constructor?.name
  if (name === 'PrismaClientInitializationError') return true
  if (name === 'PrismaClientKnownRequestError') {
    return ['P1001', 'P1002', 'P1003'].includes(error.code)
  }
  return false
}

export function prismaDatabaseUnavailableJsonResponse() {
  return NextResponse.json(
    {
      error:
        'La base de données refuse la connexion ou les identifiants sont incorrects. Corrigez DATABASE_URL (utilisateur, mot de passe, hôte, port) sur votre serveur PostgreSQL, puis redémarrez le serveur de dev.',
      code: 'DATABASE_UNAVAILABLE'
    },
    { status: 503 }
  )
}
