const { execSync } = require('child_process')

function testActivePlayersAPI() {
  try {
    console.log('🧪 Test de l\'API des joueurs actifs...')
    
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    console.log('📊 Données reçues:', {
      success: data.success,
      roomCount: data.rooms?.length || 0
    })
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('\n🏠 Rooms avec joueurs actifs:')
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
    console.error('❌ Erreur lors du test:', error.message)
  }
}

function testPageContent() {
  try {
    console.log('\n🌐 Test du contenu de la page...')
    
    const response = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    console.log('✅ Page accessible')
    console.log('📄 Taille du HTML:', response.length, 'caractères')
    
    // Vérifier si le contenu de base est présent
    const hasLotoJs = response.includes('LotoJs')
    const hasRoomsSection = response.includes('Rooms publiques disponibles')
    const hasActivePlayers = response.includes('joueur(s) actif(s)')
    
    console.log('🔍 Contenu vérifié:')
    console.log('  - Titre LotoJs:', hasLotoJs ? '✅' : '❌')
    console.log('  - Section rooms:', hasRoomsSection ? '✅' : '❌')
    console.log('  - Texte joueurs actifs:', hasActivePlayers ? '✅' : '❌')
    
  } catch (error) {
    console.error('❌ Erreur lors du test de la page:', error.message)
  }
}

function runTests() {
  console.log('🚀 Test du système de joueurs actifs...\n')
  
  testActivePlayersAPI()
  testPageContent()
  
  console.log('\n✨ Tests terminés!')
  console.log('\n📝 Note: Le nombre de joueurs actifs est actuellement égal au nombre total.')
  console.log('   Pour un système en temps réel, il faudrait implémenter le suivi des sessions WebSocket.')
}

runTests() 