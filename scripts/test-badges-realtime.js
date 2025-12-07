const { io } = require('socket.io-client')

function createTestClient(userId, roomCode) {
  const socket = io('http://localhost:3000', {
    transports: ['websocket']
  })

  socket.on('connect', () => {
    console.log(`✅ Client ${userId} connecté`)
    
    // Rejoindre la room
    socket.emit('join_game', { gameId: roomCode, userId: userId })
  })

  socket.on('game_joined', (data) => {
    if (data.success) {
      console.log(`🎮 Client ${userId} a rejoint la room ${roomCode}`)
    } else {
      console.log(`❌ Client ${userId} n'a pas pu rejoindre: ${data.error}`)
    }
  })

  socket.on('active_players_updated', (data) => {
    console.log(`📊 Badge mis à jour - Room ${data.roomCode}: ${data.activeCount} joueurs actifs`)
  })

  socket.on('player_joined', (data) => {
    console.log(`👤 Joueur rejoint: ${data.playerName} dans la room ${data.roomCode}`)
  })

  socket.on('player_left', (data) => {
    console.log(`👋 Joueur quitté: ${data.playerName} de la room ${data.roomCode}`)
  })

  return socket
}

function testBadgesRealtime() {
  console.log('🚀 Test des badges en temps réel...\n')

  const clients = []
  const roomCode = '855699' // Room de test

  console.log('📱 Création des clients de test pour tester les badges...')
  
  // Créer plusieurs clients pour tester les badges
  const client1 = createTestClient('test-user-1', roomCode)
  const client2 = createTestClient('test-user-2', roomCode)
  const client3 = createTestClient('test-user-3', roomCode)
  
  clients.push(client1, client2, client3)

  // Simuler des connexions et déconnexions pour tester les badges
  setTimeout(() => {
    console.log('\n🔄 Test de déconnexion (badge devrait diminuer)...')
    client1.disconnect()
  }, 2000)

  setTimeout(() => {
    console.log('\n🔄 Test de reconnexion (badge devrait augmenter)...')
    const client4 = createTestClient('test-user-4', roomCode)
    clients.push(client4)
  }, 4000)

  setTimeout(() => {
    console.log('\n🔄 Test de déconnexion multiple (badge devrait diminuer)...')
    client2.disconnect()
    client3.disconnect()
  }, 6000)

  setTimeout(() => {
    console.log('\n🔄 Test de reconnexion multiple (badge devrait augmenter)...')
    const client5 = createTestClient('test-user-5', roomCode)
    const client6 = createTestClient('test-user-6', roomCode)
    clients.push(client5, client6)
  }, 8000)

  setTimeout(() => {
    console.log('\n🧹 Nettoyage...')
    clients.forEach(client => {
      if (client.connected) {
        client.disconnect()
      }
    })
    process.exit(0)
  }, 12000)
}

testBadgesRealtime() 