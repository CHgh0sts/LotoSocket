'use client'

import { useState, useEffect } from 'react'

export function useClientValue(serverValue, clientValue) {
  const [value, setValue] = useState(serverValue)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setValue(clientValue)
  }, [clientValue])

  return isClient ? value : serverValue
}

export function useWindowLocation() {
  const [location, setLocation] = useState({
    origin: 'N/A',
    hostname: 'N/A',
    port: 'N/A'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocation({
        origin: window.location.origin,
        hostname: window.location.hostname,
        port: window.location.port || '80'
      })
    }
  }, [])

  return location
} 