import { prisma } from './prisma.js'

// Opérations pour les rooms
export const roomOperations = {
  // Créer une nouvelle room
  async createRoom(data) {
    return await prisma.room.create({
      data: {
        code: data.code,
        name: data.name,
        creatorId: data.creatorId,
        isActive: true,
      },
      include: {
        creator: true,
        Party: {
          orderBy: { createdAt: 'desc' }
        },
        Cartons: true,
      },
    })
  },

  // Obtenir une room par code
  async getRoomByCode(code) {
    return await prisma.room.findUnique({
      where: { code },
      include: {
        creator: true,
        Party: {
          orderBy: { createdAt: 'desc' }
        },
        Cartons: {
          include: {
            user: true
          }
        },
      },
    })
  },

  // Obtenir une room par ID
  async getRoomById(id) {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        creator: true,
        Party: {
          orderBy: { createdAt: 'desc' }
        },
        Cartons: true,
      },
    })
  },

  // Mettre à jour le statut actif
  async updateRoomStatus(id, isActive) {
    return await prisma.room.update({
      where: { id },
      data: { isActive },
    })
  },
}

// Opérations pour les parties
export const partyOperations = {
  // Créer une nouvelle partie
  async createParty(data) {
    return await prisma.party.create({
      data: {
        gameType: data.gameType || '1Ligne',
        roomId: data.roomId,
        listNumbers: [],
      },
      include: {
        room: true,
      },
    })
  },

  // Obtenir les parties d'une room
  async getPartiesByRoomId(roomId) {
    return await prisma.party.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // Mettre à jour le type de jeu d'une partie
  async updatePartyGameType(id, gameType) {
    return await prisma.party.update({
      where: { id },
      data: { gameType },
    })
  },

  // Ajouter un numéro à la liste des numéros tirés
  async addNumberToParty(partyId, number) {
    const party = await prisma.party.findUnique({
      where: { id: partyId }
    })
    
    const updatedListNumbers = [...(party.listNumbers || []), number]
    
    return await prisma.party.update({
      where: { id: partyId },
      data: { listNumbers: updatedListNumbers },
    })
  },
}

// Opérations pour les utilisateurs
export const userOperations = {
  // Créer un utilisateur
  async createUser(data) {
    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password, // Note: devrait être hashé
        emailVerified: data.emailVerified || false,
        emailVerificationToken: data.emailVerificationToken,
      },
    })
  },

  // Obtenir un utilisateur par email
  async getUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    })
  },

  // Obtenir un utilisateur par ID
  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        rooms: true,
        cartons: true,
      },
    })
  },
}

// Opérations pour les cartons
export const cartonOperations = {
  // Créer un carton
  async createCarton(data) {
    return await prisma.carton.create({
      data: {
        numbers: data.numbers,
        userId: data.userId,
        roomId: data.roomId,
      },
      include: {
        user: true,
        room: true,
      },
    })
  },

  // Mettre à jour un carton
  async updateCarton(id, data) {
    return await prisma.carton.update({
      where: { id },
      data,
    })
  },

  // Obtenir les cartons d'une room
  async getCartonsByRoomId(roomId) {
    return await prisma.carton.findMany({
      where: { roomId },
      include: {
        user: true,
        room: true,
      },
    })
  },
}

// Utilitaires généraux
export const dbUtils = {
  // Vérifier la connexion à la base de données
  async checkConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.log('Erreur de connexion à la base de données:', error)
      return false
    }
  },

  // Fermer la connexion
  async disconnect() {
    await prisma.$disconnect()
  },
} 