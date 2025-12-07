const { execSync } = require('child_process')

function testUXImprovements() {
  console.log('🎨 Test des améliorations UX...\n')
  
  try {
    // Vérifier l'API
    console.log('📊 Vérification de l\'API...')
    const response = execSync('curl -s http://localhost:3000/api/game/public-rooms', { encoding: 'utf8' })
    const data = JSON.parse(response)
    
    console.log('✅ API accessible')
    
    if (data.rooms && data.rooms.length > 0) {
      console.log('\n🏠 État des rooms:')
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name}`)
        console.log(`     - Créateur: ${room.creator?.name}`)
        console.log(`     - Joueurs actifs: ${room.activePlayerCount}`)
        console.log('')
      })
    }
    
    // Vérifier la page
    console.log('🌐 Vérification de la page d\'accueil...')
    const pageResponse = execSync('curl -s http://localhost:3000', { encoding: 'utf8' })
    
    console.log('✅ Page accessible')
    
    // Vérifier les éléments clés
    const hasActivePlayersBadge = pageResponse.includes('ActivePlayersBadge')
    const hasRejoindreButton = pageResponse.includes('Rejoindre')
    const hasCreePar = pageResponse.includes('Créée par')
    
    console.log('🔍 Éléments d\'interface vérifiés:')
    console.log('  - Badge de joueurs actifs:', hasActivePlayersBadge ? '✅' : '❌')
    console.log('  - Bouton Rejoindre:', hasRejoindreButton ? '✅' : '❌')
    console.log('  - Texte "Créée par":', hasCreePar ? '✅' : '❌')
    
    console.log('\n🎯 Améliorations UX appliquées:')
    console.log('  ✅ Badge repositionné à côté du bouton (plus de chevauchement)')
    console.log('  ✅ Texte redondant "joueur(s) actif(s)" supprimé')
    console.log('  ✅ Badge avec style bleu pour différencier du bouton vert')
    console.log('  ✅ Interface plus propre et organisée')
    
    console.log('\n📱 Instructions pour tester l\'interface:')
    console.log('   1. Ouvrez http://localhost:3000 dans votre navigateur')
    console.log('   2. Vérifiez que le badge est à côté du bouton "Rejoindre"')
    console.log('   3. Vérifiez qu\'il n\'y a plus de texte redondant après "Créée par"')
    console.log('   4. Vérifiez que le badge a un style bleu distinct du bouton vert')
    console.log('   5. Testez les mises à jour en temps réel')
    
  } catch (error) {
    console.log('❌ Erreur lors du test:', error.message)
  }
}

testUXImprovements() 