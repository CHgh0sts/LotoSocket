const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkActiveSessions() {
  try {
    console.log('🔍 Vérification des sessions actives...\n')
    
    // Récupérer toutes les sessions actives
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 Total des sessions actives: ${activeSessions.length}\n`)
    
    // Grouper par room
    const sessionsByRoom = {}
    activeSessions.forEach(session => {
      if (!sessionsByRoom[session.roomCode]) {
        sessionsByRoom[session.roomCode] = []
      }
      sessionsByRoom[session.roomCode].push(session)
    })
    
    console.log('🏠 Sessions par room:')
    for (const [roomCode, sessions] of Object.entries(sessionsByRoom)) {
      console.log(`\n  Room ${roomCode}: ${sessions.length} session(s) active(s)`)
      sessions.forEach(session => {
        console.log(`    - Socket: ${session.socketId}`)
        console.log(`    - User: ${session.user?.name || 'Anonyme'} (${session.userId || 'Pas d\'utilisateur'})`)
        console.log(`    - Créé: ${session.createdAt.toLocaleString()}`)
      })
    }
    
    // Nettoyer les sessions orphelines (plus de 1 heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const oldSessions = await prisma.activeSession.findMany({
      where: {
        isActive: true,
        createdAt: {
          lt: oneHourAgo
        }
      }
    })
    
    if (oldSessions.length > 0) {
      console.log(`\n🧹 Nettoyage de ${oldSessions.length} session(s) ancienne(s)...`)
      await prisma.activeSession.updateMany({
        where: {
          id: {
            in: oldSessions.map(s => s.id)
          }
        },
        data: {
          isActive: false
        }
      })
      console.log('✅ Sessions anciennes nettoyées')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkActiveSessions() 