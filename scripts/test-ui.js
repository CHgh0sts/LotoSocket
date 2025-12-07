const { execSync } = require('child_process')

function testPublicRoomsAPI() {
  try {
    console.log('🧪 Test de l\'API des rooms publiques...')
    
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    console.log('📊 Données reçues:', {
      success: data.success,
      roomCount: data.rooms?.length || 0
    })
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('🏠 Première room:')
      console.log('  - Nom:', data.rooms[0].name)
      console.log('  - Code:', data.rooms[0].code)
      console.log('  - Public:', data.rooms[0].isPublic)
      console.log('  - Créateur:', data.rooms[0].creator?.name)
      console.log('  - Joueurs:', data.rooms[0].playerCount)
    }
    
    console.log('\n📋 Toutes les rooms:')
    data.rooms?.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} (Code: ${room.code})`)
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
  }
}

function testPageLoad() {
  try {
    console.log('\n🌐 Test du chargement de la page...')
    
    const response = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    console.log('✅ Page accessible')
    console.log('📄 Taille du HTML:', response.length, 'caractères')
    
    // Vérifier si le contenu de base est présent
    const hasLotoJs = response.includes('LotoJs')
    const hasRoomsSection = response.includes('Rooms publiques disponibles')
    
    console.log('🔍 Contenu vérifié:')
    console.log('  - Titre LotoJs:', hasLotoJs ? '✅' : '❌')
    console.log('  - Section rooms:', hasRoomsSection ? '✅' : '❌')
    
  } catch (error) {
    console.error('❌ Erreur lors du test de la page:', error.message)
  }
}

function runTests() {
  console.log('🚀 Démarrage des tests...\n')
  
  testPublicRoomsAPI()
  testPageLoad()
  
  console.log('\n✨ Tests terminés!')
}

runTests() 