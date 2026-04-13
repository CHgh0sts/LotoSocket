import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ message: 'Token manquant' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    try {
      jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return Response.json({ message: 'Token invalide' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')

    const where = gameType ? { gameType } : {}

    const parties = await prisma.party.findMany({
      where,
      select: { listNumbers: true, gameType: true }
    })

    // Pour chaque numéro 1-90, calculer :
    // - frequency: dans combien de parties ce numéro est sorti
    // - avgPosition: position moyenne de sortie (1 = sorti en premier, plus c'est bas mieux c'est)
    // - earlyRate: % de parties où le numéro est sorti dans les 30 premiers tirages
    const freq = {}
    const positionSums = {}
    const positionCounts = {}
    const earlyCounts = {}

    for (let n = 1; n <= 90; n++) {
      freq[n] = 0
      positionSums[n] = 0
      positionCounts[n] = 0
      earlyCounts[n] = 0
    }

    const totalParties = parties.length

    parties.forEach(party => {
      const nums = party.listNumbers || []
      nums.forEach((num, idx) => {
        if (num >= 1 && num <= 90) {
          freq[num]++
          positionSums[num] += idx + 1
          positionCounts[num]++
          if (idx < 30) earlyCounts[num]++
        }
      })
    })

    const stats = {}
    for (let n = 1; n <= 90; n++) {
      stats[n] = {
        frequency: freq[n],
        frequencyPct: totalParties > 0 ? Math.round((freq[n] / totalParties) * 10000) / 100 : 0,
        avgPosition: positionCounts[n] > 0 ? Math.round((positionSums[n] / positionCounts[n]) * 10) / 10 : null,
        earlyRate: totalParties > 0 ? Math.round((earlyCounts[n] / totalParties) * 10000) / 100 : 0
      }
    }

    // Nombre moyen de tirages avant un win par type de partie
    // Chaque Party.listNumbers.length = nombre de tirages de cette manche
    const allParties = await prisma.party.findMany({
      select: { listNumbers: true, gameType: true }
    })

    const winStats = {}
    const typeGroups = {}
    allParties.forEach(p => {
      const len = (p.listNumbers || []).length
      if (len === 0) return
      if (!typeGroups[p.gameType]) typeGroups[p.gameType] = []
      typeGroups[p.gameType].push(len)
    })

    for (const [type, lengths] of Object.entries(typeGroups)) {
      const sorted = [...lengths].sort((a, b) => a - b)
      winStats[type] = {
        avg: Math.round((lengths.reduce((s, l) => s + l, 0) / lengths.length) * 10) / 10,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median: sorted[Math.floor(sorted.length / 2)],
        count: lengths.length
      }
    }

    return Response.json({
      success: true,
      totalParties,
      stats,
      winStats
    })

  } catch (error) {
    console.log('Erreur lors du calcul des stats:', error)
    return Response.json({ message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
