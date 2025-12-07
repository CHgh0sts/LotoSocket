const { execSync } = require('child_process')

function testInitialization() {
  console.log('🧪 Test de l\'initialisation des badges...\n')
  
  try {
    // Vérifier l'API
    console.log('📊 Vérification de l\'API...')
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('\n🏠 Valeurs attendues pour les badges:')
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name}`)
        console.log(`     - Code: ${room.code}`)
        console.log(`     - Joueurs actifs attendus: ${room.activePlayerCount}`)
        console.log('')
      })
    }
    
    // Vérifier la page
    console.log('🌐 Vérification de la page d\'accueil...')
    const pageResponse = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    console.log('✅ Page accessible')
    console.log('📄 Taille du HTML:', pageResponse.length, 'caractères')
    
    // Vérifier les éléments clés
    const hasActivePlayersBadge = pageResponse.includes('ActivePlayersBadge')
    const hasUseActivePlayers = pageResponse.includes('useActivePlayers')
    const hasSocketIo = pageResponse.includes('socket.io')
    
    console.log('🔍 Composants vérifiés:')
    console.log('  - Hook useActivePlayers:', hasUseActivePlayers ? '✅' : '❌')
    console.log('  - Composant ActivePlayersBadge:', hasActivePlayersBadge ? '✅' : '❌')
    console.log('  - Socket.IO:', hasSocketIo ? '✅' : '❌')
    
    console.log('\n🎯 Instructions pour tester l\'initialisation:')
    console.log('   1. Ouvrez http://localhost:3000 dans un nouveau navigateur')
    console.log('   2. Les badges devraient afficher les bonnes valeurs immédiatement')
    console.log('   3. Vérifiez que "Partie de CHghosts" affiche 1 joueur actif')
    console.log('   4. Ouvrez les outils de développement (F12) → Console')
    console.log('   5. Vous devriez voir "📊 Valeurs initiales récupérées:"')
    console.log('   6. Puis "WebSocket connecté pour les joueurs actifs"')
    
    console.log('\n⚠️  Si les badges affichent 0:')
    console.log('   - Vérifiez que le serveur WebSocket fonctionne')
    console.log('   - Vérifiez les logs dans la console du navigateur')
    console.log('   - Assurez-vous que l\'API /api/game/public-rooms fonctionne')
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
  }
}

testInitialization() 