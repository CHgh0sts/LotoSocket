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
    console.log(`📊 Mise à jour temps réel - Room ${data.roomCode}: ${data.activeCount} joueurs actifs`)
  })

  socket.on('player_joined', (data) => {
    console.log(`👤 Joueur rejoint: ${data.playerName} dans la room ${data.roomCode}`)
  })

  socket.on('player_left', (data) => {
    console.log(`👋 Joueur quitté: ${data.playerName} de la room ${data.roomCode}`)
  })

  return socket
}

function testRealtimeUpdates() {
  console.log('🚀 Test des mises à jour en temps réel...\n')

  const clients = []
  const roomCode = '855699' // Room de test

  // Créer plusieurs clients
  console.log('📱 Création des clients de test...')
  
  const client1 = createTestClient('test-user-1', roomCode)
  const client2 = createTestClient('test-user-2', roomCode)
  
  clients.push(client1, client2)

  // Simuler des connexions et déconnexions
  setTimeout(() => {
    console.log('\n🔄 Test de déconnexion...')
    client1.disconnect()
  }, 3000)

  setTimeout(() => {
    console.log('\n🔄 Test de reconnexion...')
    const client3 = createTestClient('test-user-3', roomCode)
    clients.push(client3)
  }, 5000)

  setTimeout(() => {
    console.log('\n🔄 Test de déconnexion multiple...')
    client2.disconnect()
  }, 7000)

  setTimeout(() => {
    console.log('\n🧹 Nettoyage...')
    clients.forEach(client => {
      if (client.connected) {
        client.disconnect()
      }
    })
    process.exit(0)
  }, 10000)
}

testRealtimeUpdates() 