# Star Trek Diplomacy

A 7-player grand strategy game set in the Star Trek universe, based on the classic Diplomacy board game mechanics.

## Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Chrome browser** (for running tests)

Verify installation:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/RogersJohn/star-trek-diplomacy.git
cd star-trek-diplomacy/star-trek-diplomacy

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. (Optional) Install test dependencies
cd ../tests
npm install
```

### Running the Game

You need **two terminal windows** running simultaneously:

**Terminal 1 - Start the Backend Server:**
```bash
cd backend
npm run dev
```
Wait for: `Server running on port 3001`

**Terminal 2 - Start the Frontend:**
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:5173`

**Open the game:**
Navigate to **http://localhost:5173** in your browser.

### Playing with Multiple Players

For local testing with multiple players:
1. Open http://localhost:5173 in multiple browser windows/tabs
2. Each window can log in as a different test player (Player1-Player7)
3. One player creates a lobby, others join with the lobby code
4. Select factions, mark ready, and start the game

For remote play, deploy to a hosting service (see Deployment section).

---

## Game Rules

See **[RULES.md](RULES.md)** for complete game rules including:
- Turn structure and phases
- Order types (Hold, Move, Support, Convoy)
- Combat resolution
- Victory conditions
- Faction abilities with timing rules

---

## Factions

| Faction | Starting Units | Victory Threshold | Special Ability |
|---------|----------------|-------------------|-----------------|
| **Federation** | 5 fleets | 10 supply centers | Diplomatic Immunity (prevent 1 dislodge/game) |
| **Klingon** | 5 fleets | 12 supply centers | Warrior's Rage (+1 attack, -1 defense) |
| **Romulan** | 4 fleets | 8 supply centers | Tal Shiar Intel (reveal 1-2 enemy orders) |
| **Cardassian** | 5 fleets | 14 supply centers | Obsidian Order (see move destinations) |
| **Ferengi** | 3 fleets | 9 SC or 100 latinum | Rules of Acquisition (bribe/sabotage) |
| **Breen** | 6 fleets | 18 supply centers | Energy Dampening (freeze territory/game) |
| **Gorn** | 5 fleets | 9 supply centers | Reptilian Resilience (50% survive destruction) |

---

## Running Tests

The project includes a comprehensive Selenium E2E test suite (272 tests).

### Prerequisites for Tests
- Chrome browser installed
- ChromeDriver (automatically managed by selenium-webdriver)
- Backend and frontend servers running

### Run All Tests
```bash
# Make sure backend is running in another terminal first
cd tests
npm test
```

### Run Specific Test Suite
```bash
npm test -- --testPathPattern="lobby.test"    # Lobby tests only
npm test -- --testPathPattern="smoke.test"    # Quick smoke tests
```

---

## Project Structure

```
star-trek-diplomacy/
├── backend/
│   ├── src/
│   │   ├── engine/              # Core game logic
│   │   │   ├── diplomacy-engine.js
│   │   │   ├── map-data.js
│   │   │   ├── faction-abilities.js
│   │   │   └── alliance-system.js
│   │   ├── api/                 # REST endpoints
│   │   ├── game-manager.js
│   │   ├── database.js          # SQLite persistence
│   │   └── index.js             # Express + Socket.io server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Home.jsx
│   │   │   ├── Lobby.jsx
│   │   │   ├── Game.jsx
│   │   │   ├── OrderPanel.jsx
│   │   │   ├── AlliancePanel.jsx
│   │   │   ├── FactionAbilityPanel.jsx
│   │   │   ├── MessagesPanel.jsx
│   │   │   └── map/GameMap.jsx
│   │   ├── hooks/useGameStore.js
│   │   └── App.jsx
│   └── package.json
├── tests/
│   ├── helpers/test-helper.js   # Test utilities
│   ├── pages/                   # Page objects
│   ├── *.test.js                # Test suites
│   └── package.json
├── RULES.md                     # Official game rules
└── README.md
```

---

## API Reference

### Lobby Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lobby/create` | Create new game lobby |
| GET | `/api/lobby/:id` | Get lobby info |
| POST | `/api/lobby/:id/join` | Join lobby |
| POST | `/api/lobby/:id/select-faction` | Choose faction |
| POST | `/api/lobby/:id/ready` | Toggle ready status |
| POST | `/api/lobby/:id/start` | Start game (host only) |

### Game Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/game/:id` | Get public game state |
| GET | `/api/game/:id/player/:faction` | Get player-specific state |
| POST | `/api/game/:id/orders` | Submit orders |
| POST | `/api/game/:id/retreats` | Submit retreat orders |
| POST | `/api/game/:id/builds` | Submit build/disband orders |

### WebSocket Events
- `player_joined` - Player joined lobby
- `faction_selected` - Faction selection changed
- `game_started` - Game has started
- `orders_submitted` - Player submitted orders
- `turn_resolved` - Turn resolution complete
- `message_received` - New chat message

---

## Deployment

### Railway (Recommended)

1. Create a Railway project at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add two services:
   - **Backend**: Root directory = `/backend`
   - **Frontend**: Root directory = `/frontend`
4. Set environment variables:
   - Backend: `PORT=3001`, `FRONTEND_URL=https://your-frontend.railway.app`
   - Frontend: `VITE_API_URL=https://your-backend.railway.app`

### Other Platforms
Works with any Node.js hosting (Render, Fly.io, Heroku, etc.)

---

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, SQLite
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand
- **Testing**: Jest, Selenium WebDriver

---

## Development Status

### Completed
- [x] Core game engine with order resolution
- [x] 7 faction abilities with unique mechanics
- [x] Alliance system with shared victory
- [x] In-game messaging
- [x] SQLite persistence
- [x] Real-time updates via WebSocket
- [x] Comprehensive E2E test suite (272 tests)

### Planned
- [ ] 3D map visualization (Three.js)
- [ ] Turn timers with auto-resolution
- [ ] Spectator mode
- [ ] Game replays
- [ ] Mobile optimization

---

## License

MIT

## Credits

- Based on Diplomacy by Allan B. Calhamer
- Star Trek universe owned by Paramount/CBS
- Built with Claude AI assistance
