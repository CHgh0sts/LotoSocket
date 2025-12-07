const { io } = require('socket.io-client')

function testBadgeUpdates() {
  console.log('🧪 Test des mises à jour des badges...\n')
  
  const roomCode = '855699' // Room de test
  const userId = 'cmdoffcut0000vyi25fixahj0' // Utilisateur existant (CHghosts)
  
  // Créer un client de test
  const socket = io('http://localhost:3000', {
    transports: ['websocket']
  })

  socket.on('connect', () => {
    console.log('✅ Client de test connecté')
    console.log(`👤 Utilisateur: ${userId}`)
    
    // Rejoindre la room
    socket.emit('join_game', { gameId: roomCode, userId: userId })
  })

  socket.on('game_joined', (data) => {
    if (data.success) {
      console.log(`🎮 Client a rejoint la room ${roomCode}`)
      console.log('📊 Le badge devrait maintenant afficher le bon nombre de joueurs')
    } else {
      console.log(`❌ Erreur: ${data.error}`)
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

  // Attendre 3 secondes puis déconnecter
  setTimeout(() => {
    console.log('\n🔄 Déconnexion du client de test...')
    socket.disconnect()
    
    setTimeout(() => {
      console.log('📊 Le badge devrait maintenant afficher le bon nombre de joueurs')
      console.log('\n✅ Test terminé!')
      process.exit(0)
    }, 2000)
  }, 3000)
}

testBadgeUpdates() 