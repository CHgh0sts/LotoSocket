'use client'

import { useState, useEffect } from 'react'
import { useSocket } from '@/contexts/SocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { useWindowLocation } from '@/hooks/useClientValue'

export default function SocketDiagnostic() {
  const { socket, isConnected } = useSocket()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const location = useWindowLocation()

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp }])
  }

  useEffect(() => {
    if (socket) {
      const events = [
        'connect',
        'disconnect',
        'connect_error',
        'reconnect',
        'reconnect_error',
        'reconnect_failed'
      ]

      events.forEach(event => {
        socket.on(event, (data) => {
          addLog(`Socket ${event}: ${data || ''}`, event.includes('error') ? 'error' : 'success')
        })
      })

      return () => {
        events.forEach(event => {
          socket.off(event)
        })
      }
    }
  }, [socket])

  useEffect(() => {
    addLog(`Utilisateur: ${user ? user.name : 'Non connecté'}`, user ? 'success' : 'warning')
  }, [user])

  useEffect(() => {
    addLog(`Socket connecté: ${isConnected}`, isConnected ? 'success' : 'error')
  }, [isConnected])

  if (!isVisible) {
    return (
      <div className='fixed bottom-4 right-4 z-40 flex items-center justify-center'>
      <button
        onClick={() => setIsVisible(true)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Diagnostic Socket.IO"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          Socket.IO Diagnostic
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <div className="text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300">État:</span>
          <span className={`ml-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
        
        <div className="text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300">URL:</span>
          <span className="ml-1 text-gray-600 dark:text-gray-400 font-mono text-xs">
            {location.origin}
          </span>
        </div>

        <div className="text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300">Transport:</span>
          <span className="ml-1 text-gray-600 dark:text-gray-400">
            {socket?.io?.engine?.transport?.name || 'N/A'}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Logs récents:</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Aucun log</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-xs flex items-start gap-2">
                <span className="text-gray-400 dark:text-gray-500 font-mono text-xs">
                  {log.timestamp}
                </span>
                <span className={`flex-1 ${
                  log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
        <button
          onClick={() => setLogs([])}
          className="w-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-1 px-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Effacer les logs
        </button>
      </div>
    </div>
  )
} 