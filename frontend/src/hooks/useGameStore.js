import { create } from 'zustand'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || ''

export const useGameStore = create((set, get) => ({
  // Connection
  socket: null,
  connected: false,
  
  // Player info
  playerName: localStorage.getItem('playerName') || '',
  faction: null,
  
  // Game state
  gameId: null,
  gameState: null,
  myState: null,
  
  // UI state
  selectedUnit: null,
  pendingOrders: [],
  
  // Actions
  setPlayerName: (name) => {
    localStorage.setItem('playerName', name)
    set({ playerName: name })
  },
  
  connect: () => {
    const socket = io(API_URL)
    
    socket.on('connect', () => {
      set({ connected: true })
    })
    
    socket.on('disconnect', () => {
      set({ connected: false })
    })
    
    socket.on('game_state_update', (state) => {
      set({ gameState: state })
    })
    
    socket.on('phase_resolved', (results) => {
      // Refresh game state
      get().fetchGameState()
    })
    
    socket.on('player_ready', ({ faction }) => {
      // Update UI to show who has submitted
    })
    
    set({ socket })
  },
  
  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },
  
  joinGame: (gameId, faction) => {
    const { socket } = get()
    if (socket) {
      socket.emit('join_game', gameId)
      set({ gameId, faction })
      get().fetchGameState()
      get().fetchPlayerState()
    }
  },
  
  fetchGameState: async () => {
    const { gameId } = get()
    if (!gameId) return
    
    try {
      const res = await fetch(`${API_URL}/api/game/${gameId}`)
      const state = await res.json()
      set({ gameState: state })
    } catch (err) {
      console.error('Failed to fetch game state:', err)
    }
  },
  
  fetchPlayerState: async () => {
    const { gameId, faction } = get()
    if (!gameId || !faction) return
    
    try {
      const res = await fetch(`${API_URL}/api/game/${gameId}/player/${faction}`)
      const state = await res.json()
      set({ myState: state })
    } catch (err) {
      console.error('Failed to fetch player state:', err)
    }
  },
  
  selectUnit: (location) => {
    set({ selectedUnit: location })
  },
  
  addOrder: (order) => {
    set(state => ({
      pendingOrders: [...state.pendingOrders, order],
      selectedUnit: null
    }))
  },
  
  removeOrder: (index) => {
    set(state => ({
      pendingOrders: state.pendingOrders.filter((_, i) => i !== index)
    }))
  },
  
  clearOrders: () => {
    set({ pendingOrders: [], selectedUnit: null })
  },
  
  submitOrders: async () => {
    const { gameId, faction, pendingOrders } = get()
    
    try {
      const res = await fetch(`${API_URL}/api/game/${gameId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faction, orders: pendingOrders })
      })
      
      const result = await res.json()
      
      if (result.success) {
        set({ pendingOrders: [] })
        get().fetchPlayerState()
      }
      
      return result
    } catch (err) {
      console.error('Failed to submit orders:', err)
      return { success: false, error: err.message }
    }
  },
  
  sendMessage: (to, content) => {
    const { socket, gameId, faction } = get()
    if (socket && gameId) {
      socket.emit('private_message', {
        gameId,
        from: faction,
        to,
        message: content
      })
    }
  }
}))
