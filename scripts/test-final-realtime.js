const { execSync } = require('child_process')

function testAPI() {
  try {
    console.log('🧪 Test de l\'API des rooms publiques...')
    
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    console.log('📊 Rooms trouvées:', data.rooms?.length || 0)
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('\n🏠 État actuel des rooms:')
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name}`)
        console.log(`     - Code: ${room.code}`)
        console.log(`     - Joueurs totaux: ${room.playerCount}`)
        console.log(`     - Joueurs actifs: ${room.activePlayerCount}`)
        console.log(`     - Créateur: ${room.creator?.name}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message)
  }
}

function testWebSocket() {
  try {
    console.log('\n🔌 Test du WebSocket...')
    
    // Vérifier si le serveur répond
    const response = execSync('curl -s http://localhost:3000/socket.io/', { encoding: 'utf8' })
    
    if (response.includes('socket.io')) {
      console.log('✅ Serveur WebSocket accessible')
    } else {
      console.log('❌ Serveur WebSocket non accessible')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test WebSocket:', error.message)
  }
}

function testPage() {
  try {
    console.log('\n🌐 Test de la page d\'accueil...')
    
    const response = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    console.log('✅ Page accessible')
    console.log('📄 Taille du HTML:', response.length, 'caractères')
    
    // Vérifier les éléments clés
    const hasLotoJs = response.includes('LotoJs')
    const hasRoomsSection = response.includes('Rooms publiques disponibles')
    const hasActivePlayers = response.includes('joueur(s) actif(s)')
    const hasLiveIndicator = response.includes('Live')
    
    console.log('🔍 Contenu vérifié:')
    console.log('  - Titre LotoJs:', hasLotoJs ? '✅' : '❌')
    console.log('  - Section rooms:', hasRoomsSection ? '✅' : '❌')
    console.log('  - Texte joueurs actifs:', hasActivePlayers ? '✅' : '❌')
    console.log('  - Indicateur Live:', hasLiveIndicator ? '✅' : '❌')
    
  } catch (error) {
    console.error('❌ Erreur lors du test de la page:', error.message)
  }
}

function runFinalTest() {
  console.log('🚀 Test final du système de temps réel...\n')
  
  testAPI()
  testWebSocket()
  testPage()
  
  console.log('\n✨ Test final terminé!')
  console.log('\n📝 Instructions pour tester en temps réel:')
  console.log('   1. Ouvrez http://localhost:3000 dans votre navigateur')
  console.log('   2. Ouvrez les outils de développement (F12)')
  console.log('   3. Allez dans l\'onglet Console')
  console.log('   4. Vous devriez voir "WebSocket connecté pour les joueurs actifs"')
  console.log('   5. Les mises à jour en temps réel apparaîtront dans la console')
}

runFinalTest() 