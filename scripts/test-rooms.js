const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestRooms() {
  try {
    console.log('Création de rooms de test...')

    // Créer des utilisateurs de test d'abord
    const testUsers = [
      { id: 'test-user-1', name: 'Utilisateur Test 1', email: 'test1@example.com' },
      { id: 'test-user-2', name: 'Utilisateur Test 2', email: 'test2@example.com' },
      { id: 'test-user-3', name: 'Utilisateur Test 3', email: 'test3@example.com' },
      { id: 'test-user-4', name: 'Utilisateur Test 4', email: 'test4@example.com' }
    ]

    for (const user of testUsers) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: user
      })
      console.log(`👤 Utilisateur créé: ${user.name}`)
    }

    // Créer quelques rooms publiques
    const publicRooms = [
      {
        code: '123456',
        name: 'Partie publique de test 1',
        isPublic: true,
        password: null,
        creatorId: 'test-user-1'
      },
      {
        code: '234567',
        name: 'Partie publique de test 2',
        isPublic: true,
        password: null,
        creatorId: 'test-user-2'
      }
    ]

    // Créer quelques rooms privées
    const privateRooms = [
      {
        code: '345678',
        name: 'Partie privée de test 1',
        isPublic: false,
        password: 'secret123',
        creatorId: 'test-user-3'
      },
      {
        code: '456789',
        name: 'Partie privée de test 2',
        isPublic: false,
        password: 'password456',
        creatorId: 'test-user-4'
      }
    ]

    // Créer les rooms publiques
    for (const room of publicRooms) {
      await prisma.room.upsert({
        where: { code: room.code },
        update: {},
        create: room
      })
      console.log(`✅ Room publique créée: ${room.name} (Code: ${room.code})`)
    }

    // Créer les rooms privées
    for (const room of privateRooms) {
      await prisma.room.upsert({
        where: { code: room.code },
        update: {},
        create: room
      })
      console.log(`🔒 Room privée créée: ${room.name} (Code: ${room.code}, Password: ${room.password})`)
    }

    console.log('\n🎉 Rooms de test créées avec succès!')
    console.log('\nRooms publiques:')
    console.log('- Code: 123456, Nom: Partie publique de test 1')
    console.log('- Code: 234567, Nom: Partie publique de test 2')
    console.log('\nRooms privées:')
    console.log('- Code: 345678, Nom: Partie privée de test 1, Password: secret123')
    console.log('- Code: 456789, Nom: Partie privée de test 2, Password: password456')

  } catch (error) {
    console.error('Erreur lors de la création des rooms de test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestRooms() 