const { execSync } = require('child_process')

function checkAPI() {
  try {
    console.log('🔍 Vérification de l\'API des rooms publiques...')
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    console.log(`📊 ${data.rooms?.length || 0} rooms trouvées\n`)
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('🏠 État actuel des rooms:')
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name}`)
        console.log(`     - Code: ${room.code}`)
        console.log(`     - Joueurs totaux: ${room.playerCount}`)
        console.log(`     - Joueurs actifs: ${room.activePlayerCount}`)
        console.log(`     - Créateur: ${room.creator?.name}`)
        console.log('')
      })
    }
    
    return data.rooms || []
  } catch (error) {
    console.error('❌ Erreur lors de la vérification API:', error.message)
    return []
  }
}

function showInstructions() {
  console.log('\n🎯 Instructions pour tester les badges en temps réel:')
  console.log('   1. Ouvrez http://localhost:3000 dans votre navigateur')
  console.log('   2. Vous devriez voir des badges verts en bas à droite de chaque room')
  console.log('   3. Les badges affichent le nombre de joueurs actuellement connectés')
  console.log('   4. Un point vert animé indique que les données sont en temps réel')
  console.log('   5. Ouvrez les outils de développement (F12) → Console')
  console.log('   6. Vous verrez les logs WebSocket en temps réel')
  console.log('')
  console.log('🧪 Pour tester les mises à jour:')
  console.log('   - Ouvrez plusieurs onglets avec la même room')
  console.log('   - Ou utilisez le script: node scripts/test-badges-realtime.js')
  console.log('')
  console.log('✨ Fonctionnalités des badges:')
  console.log('   - Affichage en temps réel du nombre de joueurs connectés')
  console.log('   - Mise à jour automatique via WebSocket')
  console.log('   - Indicateur visuel de connexion en temps réel')
  console.log('   - Position fixe en bas à droite de chaque room')
}

function runDemo() {
  console.log('🚀 Démonstration du système de badges en temps réel\n')
  
  const rooms = checkAPI()
  
  if (rooms.length > 0) {
    console.log('✅ Système prêt pour les tests en temps réel!')
  } else {
    console.log('⚠️  Aucune room trouvée. Créez d\'abord quelques rooms de test.')
  }
  
  showInstructions()
}

runDemo() 