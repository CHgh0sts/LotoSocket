const { execSync } = require('child_process')

function checkRooms() {
  try {
    console.log('🔄 Vérification des rooms...')
    
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    if (data.success && data.rooms && data.rooms.length > 0) {
      console.log(`✅ ${data.rooms.length} room(s) trouvée(s):`)
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name} - Code: ${room.code} - Joueurs: ${room.playerCount}`)
      })
    } else {
      console.log('❌ Aucune room trouvée')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

function checkPage() {
  try {
    console.log('\n🌐 Vérification de la page...')
    
    const response = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    // Vérifier si la page contient des éléments de base
    const hasRoomsSection = response.includes('Rooms publiques disponibles')
    const hasLoadingText = response.includes('Chargement des rooms')
    
    console.log('📄 État de la page:')
    console.log('  - Section rooms:', hasRoomsSection ? '✅' : '❌')
    console.log('  - Texte de chargement:', hasLoadingText ? '✅' : '❌')
    
  } catch (error) {
    console.error('❌ Erreur page:', error.message)
  }
}

function monitor() {
  console.log('📡 Surveillance des rooms en temps réel...\n')
  
  // Vérification initiale
  checkRooms()
  checkPage()
  
  // Surveillance continue
  setInterval(() => {
    console.log('\n' + '='.repeat(50))
    checkRooms()
    checkPage()
  }, 5000) // Vérifier toutes les 5 secondes
}

monitor() 