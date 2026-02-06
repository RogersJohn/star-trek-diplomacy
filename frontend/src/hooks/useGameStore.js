import { create } from 'zustand'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || ''

// Store getToken function reference (set by components using Clerk)
let getTokenFn = null;

export const setAuthTokenGetter = (fn) => {
  getTokenFn = fn;
};

// Helper to get auth headers
const getAuthHeaders = async () => {
  if (!getTokenFn) {
    console.warn('Auth token getter not set');
    return { 'Content-Type': 'application/json' };
  }
  const token = await getTokenFn();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const useGameStore = create((set, get) => ({
  // Connection
  socket: null,
  connected: false,
  connectionError: null,
  reconnectAttempts: 0,

  // Player info
  playerName: localStorage.getItem('playerName') || '',
  faction: null,

  // Game state
  gameId: null,
  gameState: null,
  myState: null,

  // Loading states
  loading: {
    gameState: false,
    playerState: false,
    submitOrders: false,
    submitRetreats: false,
    submitBuilds: false,
  },

  // Error states
  errors: {
    gameState: null,
    playerState: null,
    submitOrders: null,
  },

  // UI state
  selectedUnit: null,
  pendingOrders: [],

  // Actions
  setPlayerName: (name) => {
    localStorage.setItem('playerName', name)
    set({ playerName: name })
  },

  connect: async () => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      return; // Already connected
    }

    if (!getTokenFn) {
      console.error('Cannot connect socket: auth token getter not set');
      set({ connectionError: 'Authentication not ready' });
      return;
    }

    try {
      // Get Clerk token for socket authentication
      const token = await getTokenFn();

      const socket = io(API_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        set({ connected: true, connectionError: null, reconnectAttempts: 0 });
        // Rejoin game if we have a gameId
        const { gameId } = get();
        if (gameId) {
          socket.emit('join_game', gameId);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        set(state => ({
          connected: false,
          connectionError: err.message,
          reconnectAttempts: state.reconnectAttempts + 1,
        }));
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        set({ connected: false });
      });

      socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
      });

      socket.on('joined_game', ({ gameId, faction }) => {
        set({ faction });
      });

      socket.on('game_state_update', (state) => {
        set({ gameState: state });
      });

      socket.on('phase_resolved', () => {
        get().fetchGameState();
        get().fetchPlayerState();
      });

      socket.on('player_ready', () => {
        get().fetchGameState();
      });

      socket.on('orders_submitted', () => {
        get().fetchGameState();
      });

      socket.on('alliance_proposed', () => {
        get().fetchGameState();
        get().fetchPlayerState();
      });

      socket.on('alliance_formed', () => {
        get().fetchGameState();
        get().fetchPlayerState();
      });

      socket.on('alliance_broken', () => {
        get().fetchGameState();
        get().fetchPlayerState();
      });

      socket.on('private_message', () => {
        get().fetchPlayerState();
      });

      socket.on('broadcast_message', () => {
        get().fetchPlayerState();
      });

      set({ socket });
    } catch (err) {
      console.error('Failed to connect:', err);
      set({ connectionError: err.message });
    }
  },

  reconnect: async () => {
    const { disconnect } = get();
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 500));
    get().connect();
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },

  joinGame: (gameId) => {
    const { socket } = get()
    if (socket) {
      // Only send gameId - server will verify user and determine faction
      socket.emit('join_game', gameId)
      set({ gameId })
      get().fetchGameState()
    }
  },

  fetchGameState: async () => {
    const { gameId } = get()
    if (!gameId) return

    set(state => ({ loading: { ...state.loading, gameState: true } }));

    try {
      // Public state doesn't need auth
      const res = await fetch(`${API_URL}/api/game/${gameId}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const gameState = await res.json()
      set(state => ({
        gameState,
        loading: { ...state.loading, gameState: false },
        errors: { ...state.errors, gameState: null },
      }));
    } catch (err) {
      console.error('Failed to fetch game state:', err)
      set(state => ({
        loading: { ...state.loading, gameState: false },
        errors: { ...state.errors, gameState: err.message },
      }));
    }
  },

  fetchPlayerState: async () => {
    const { gameId, faction } = get()
    if (!gameId || !faction) return

    set(state => ({ loading: { ...state.loading, playerState: true } }));

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/player/${faction}`, {
        headers,
      })
      if (res.ok) {
        const myState = await res.json()
        set(state => ({
          myState,
          loading: { ...state.loading, playerState: false },
          errors: { ...state.errors, playerState: null },
        }));
      } else {
        const error = await res.json()
        console.error('Failed to fetch player state:', error)
        set(state => ({
          loading: { ...state.loading, playerState: false },
          errors: { ...state.errors, playerState: error.error || 'Failed to load' },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch player state:', err)
      set(state => ({
        loading: { ...state.loading, playerState: false },
        errors: { ...state.errors, playerState: err.message },
      }));
    }
  },

  selectUnit: (location) => {
    set({ selectedUnit: location })
  },

  addOrder: (order) => {
    set(state => {
      // Replace order if one already exists for this unit
      const filteredOrders = state.pendingOrders.filter(o => o.location !== order.location);
      return {
        pendingOrders: [...filteredOrders, order],
        selectedUnit: null,
      };
    })
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

    set(state => ({
      loading: { ...state.loading, submitOrders: true },
      errors: { ...state.errors, submitOrders: null },
    }));

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction, orders: pendingOrders }),
      })

      const result = await res.json()

      if (result.success) {
        set(state => ({
          pendingOrders: [],
          loading: { ...state.loading, submitOrders: false },
        }));
        get().fetchPlayerState()
      } else {
        set(state => ({
          loading: { ...state.loading, submitOrders: false },
          errors: { ...state.errors, submitOrders: result.error || 'Failed to submit' },
        }));
      }

      return result
    } catch (err) {
      console.error('Failed to submit orders:', err)
      set(state => ({
        loading: { ...state.loading, submitOrders: false },
        errors: { ...state.errors, submitOrders: err.message },
      }));
      return { success: false, error: err.message }
    }
  },

  submitRetreats: async (retreats) => {
    const { gameId, faction } = get()

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/retreats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction, retreats }),
      })

      const result = await res.json()
      if (result.success || result.phase) {
        get().fetchGameState()
        get().fetchPlayerState()
      }
      return result
    } catch (err) {
      console.error('Failed to submit retreats:', err)
      return { success: false, error: err.message }
    }
  },

  submitBuilds: async (builds) => {
    const { gameId, faction } = get()

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/builds`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction, builds }),
      })

      const result = await res.json()
      if (result.success || result.phase) {
        get().fetchGameState()
        get().fetchPlayerState()
      }
      return result
    } catch (err) {
      console.error('Failed to submit builds:', err)
      return { success: false, error: err.message }
    }
  },

  proposeAlliance: async (to, type) => {
    const { gameId, faction } = get()

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/alliance/propose`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ from: faction, to, type }),
      })

      const result = await res.json()
      get().fetchPlayerState()
      return result
    } catch (err) {
      console.error('Failed to propose alliance:', err)
      return { success: false, error: err.message }
    }
  },

  respondToAlliance: async (proposalId, accept) => {
    const { gameId, faction } = get()

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/alliance/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ proposalId, faction, accept }),
      })

      const result = await res.json()
      get().fetchPlayerState()
      return result
    } catch (err) {
      console.error('Failed to respond to alliance:', err)
      return { success: false, error: err.message }
    }
  },

  useAbility: async (ability, params) => {
    const { gameId, faction } = get()

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/game/${gameId}/ability`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction, ability, params }),
      })

      const result = await res.json()
      get().fetchPlayerState()
      return result
    } catch (err) {
      console.error('Failed to use ability:', err)
      return { success: false, error: err.message }
    }
  },

  sendMessage: (to, content) => {
    const { socket } = get()
    if (socket) {
      // Server uses authenticated faction from socket.data - no need to send from
      socket.emit('private_message', { to, message: content })
    }
  },

  broadcastMessage: (content) => {
    const { socket } = get()
    if (socket) {
      // Server uses authenticated faction from socket.data
      socket.emit('broadcast_message', { message: content })
    }
  },

  // Reset game state (when leaving game or logging out)
  resetGameState: () => {
    set({
      gameId: null,
      gameState: null,
      myState: null,
      faction: null,
      selectedUnit: null,
      pendingOrders: [],
      errors: {
        gameState: null,
        playerState: null,
        submitOrders: null,
      },
    });
  },

  // Full reset including connection
  reset: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      connected: false,
      connectionError: null,
      reconnectAttempts: 0,
      gameId: null,
      gameState: null,
      myState: null,
      faction: null,
      selectedUnit: null,
      pendingOrders: [],
      loading: {
        gameState: false,
        playerState: false,
        submitOrders: false,
        submitRetreats: false,
        submitBuilds: false,
      },
      errors: {
        gameState: null,
        playerState: null,
        submitOrders: null,
      },
    });
  },
}))
