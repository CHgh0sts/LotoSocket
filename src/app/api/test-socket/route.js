import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'API de test accessible',
    timestamp: new Date().toISOString(),
    socketServer: 'http://localhost:3000'
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      message: 'Message reçu via API',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors du traitement du message' },
      { status: 400 }
    )
  }
} 