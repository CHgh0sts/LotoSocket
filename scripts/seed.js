import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding...')

  // Créer un utilisateur de test
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
    },
  })

  console.log('✅ Utilisateur créé:', user.username)

  // Créer un jeu de test
  const game = await prisma.game.upsert({
    where: { id: 'test-game-1' },
    update: {},
    create: {
      id: 'test-game-1',
      name: 'Partie de Test',
      gameType: '1Ligne',
      currentNumber: 0,
      creatorId: user.id,
    },
  })

  console.log('✅ Jeu créé:', game.name)

  // Créer une partie de test
  const party = await prisma.party.upsert({
    where: { id: 'test-party-1' },
    update: {},
    create: {
      id: 'test-party-1',
      name: 'Ma Première Partie',
      gameType: '1Ligne',
      gameId: game.id,
      userId: user.id,
    },
  })

  console.log('✅ Partie créée:', party.name)

  // Créer un carton de test
  const carton = await prisma.carton.upsert({
    where: { id: 'test-carton-1' },
    update: {},
    create: {
      id: 'test-carton-1',
      numbers: [1, 15, 23, 45, 67, 89, 12, 34, 56, 78, 90, 11, 22, 33, 44, 55, 66, 77, 88, 99],
      partyId: party.id,
      userId: user.id,
      gameId: game.id,
    },
  })

  console.log('✅ Carton créé avec', carton.numbers.length, 'numéros')

  // Ajouter quelques numéros tirés
  const drawnNumbers = [7, 23, 45, 12, 89]
  
  for (const number of drawnNumbers) {
    await prisma.drawnNumber.create({
      data: {
        number,
        gameId: game.id,
      },
    })
  }

  console.log('✅ Numéros tirés ajoutés:', drawnNumbers)

  // Mettre à jour le numéro actuel du jeu
  await prisma.game.update({
    where: { id: game.id },
    data: { currentNumber: drawnNumbers[drawnNumbers.length - 1] },
  })

  console.log('✅ Numéro actuel mis à jour')

  console.log('🎉 Seeding terminé avec succès!')
  console.log('📊 Résumé:')
  console.log(`   - Utilisateur: ${user.username}`)
  console.log(`   - Jeu: ${game.name} (ID: ${game.id})`)
  console.log(`   - Partie: ${party.name}`)
  console.log(`   - Carton: ${carton.numbers.length} numéros`)
  console.log(`   - Numéros tirés: ${drawnNumbers.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 