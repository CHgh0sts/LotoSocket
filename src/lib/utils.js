import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Fonction pour générer un code à 6 chiffres
export function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Fonction pour valider un code de room (6 chiffres)
export function isValidRoomCode(code) {
  return /^\d{6}$/.test(code)
}
