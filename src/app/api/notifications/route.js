import { NextResponse } from 'next/server'

/**
 * Placeholder : fonctionnalité notifications non branchée au schéma Prisma.
 * Répond 200 pour éviter les 404 du badge (NotificationBadgeContext).
 */
export async function GET() {
  return NextResponse.json({ unreadCount: 0 })
}
