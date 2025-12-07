const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanSessions() {
  try {
    console.log('🧹 Nettoyage des sessions actives...\n')
    
    // Récupérer toutes les sessions actives
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 Total des sessions actives avant nettoyage: ${activeSessions.length}`)
    
    // Grouper par utilisateur et room
    const sessionsByUserAndRoom = {}
    activeSessions.forEach(session => {
      const key = `${session.userId || 'anonymous'}-${session.roomCode}`
      if (!sessionsByUserAndRoom[key]) {
        sessionsByUserAndRoom[key] = []
      }
      sessionsByUserAndRoom[key].push(session)
    })
    
    // Pour chaque groupe, garder seulement la session la plus récente
    let sessionsToDeactivate = 0
    for (const [key, sessions] of Object.entries(sessionsByUserAndRoom)) {
      if (sessions.length > 1) {
        // Garder la plus récente, désactiver les autres
        const [latest, ...older] = sessions.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        )
        
        console.log(`  ${key}: ${sessions.length} sessions → garder 1, désactiver ${older.length}`)
        
        // Désactiver les sessions plus anciennes
        await prisma.activeSession.updateMany({
          where: {
            id: {
              in: older.map(s => s.id)
            }
          },
          data: {
            isActive: false
          }
        })
        
        sessionsToDeactivate += older.length
      }
    }
    
    console.log(`\n✅ ${sessionsToDeactivate} session(s) désactivée(s)`)
    
    // Vérifier le résultat
    const remainingSessions = await prisma.activeSession.findMany({
      where: {
        isActive: true
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log(`\n📊 Sessions actives après nettoyage: ${remainingSessions.length}`)
    
    // Grouper par room
    const sessionsByRoom = {}
    remainingSessions.forEach(session => {
      if (!sessionsByRoom[session.roomCode]) {
        sessionsByRoom[session.roomCode] = []
      }
      sessionsByRoom[session.roomCode].push(session)
    })
    
    console.log('\n🏠 Sessions par room:')
    for (const [roomCode, sessions] of Object.entries(sessionsByRoom)) {
      console.log(`  Room ${roomCode}: ${sessions.length} session(s)`)
      sessions.forEach(session => {
        console.log(`    - ${session.user?.name || 'Anonyme'} (${session.userId || 'Pas d\'utilisateur'})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanSessions() 