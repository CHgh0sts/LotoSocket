import { useEffect } from 'react'
import Cookies from 'js-cookie'

export function useActivityTracker() {
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now()
      Cookies.set('last_activity', now.toString(), { 
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
    }

    // Mettre à jour l'activité sur les événements utilisateur
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    // Mettre à jour l'activité toutes les 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000)

    // Mettre à jour l'activité au chargement de la page
    updateActivity()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
      clearInterval(interval)
    }
  }, [])
} 