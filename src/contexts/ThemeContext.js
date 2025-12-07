'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [resolvedTheme, setResolvedTheme] = useState('light')

  useEffect(() => {
    // Charger le thème depuis localStorage ou détecter la préférence système
    const savedTheme = localStorage.getItem('theme') || 'system'
    setTheme(savedTheme)
    
    const updateResolvedTheme = () => {
      if (savedTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        setResolvedTheme(systemTheme)
      } else {
        setResolvedTheme(savedTheme)
      }
    }
    
    updateResolvedTheme()
    
    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateResolvedTheme)
    
    return () => mediaQuery.removeEventListener('change', updateResolvedTheme)
  }, [])

  useEffect(() => {
    // Appliquer le thème au document
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [resolvedTheme])

  const changeTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setResolvedTheme(systemTheme)
    } else {
      setResolvedTheme(newTheme)
    }
  }

  const value = {
    theme,
    resolvedTheme,
    changeTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 