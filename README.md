# Star Trek Diplomacy

A 7-player grand strategy game set in the Star Trek universe, based on the classic Diplomacy board game mechanics.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone/download this repo
cd star-trek-diplomacy

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Game Overview

### Factions (7 players)

| Faction | Home Systems | Victory | Special Ability |
|---------|--------------|---------|-----------------|
| **Federation** | 5 | 10 SC | Diplomatic Immunity (prevent 1 dislodge) |
| **Klingon** | 5 | 12 SC | Warrior's Rage (+1 attack, -1 defense) |
| **Romulan** | 4 | 8 SC | Tal Shiar (reveal enemy orders) |
| **Cardassian** | 5 | 14 SC | Obsidian Order (see move destinations) |
| **Ferengi** | 3 | 9 SC or 100 Latinum | Rules of Acquisition (bribe, sabotage) |
| **Breen** | 6 | 18 SC | Energy Dampening (freeze territory) |
| **Gorn** | 5 | 9 SC | Reptilian Resilience (50% survive destruction) |

### Map Structure

- **Core Sector** (Layer 2): Main battlefield with all 48 supply centers
- **Upper Hyperspace** (Layer 3): Bypass routes for flanking
- **Lower Hyperspace** (Layer 1): Additional bypass routes

### Victory Conditions

1. **Solo Victory**: Control required supply centers
2. **Allied Victory**: Form secret alliance, combined SC meets threshold
3. **Latinum Victory** (Ferengi only): Accumulate 100 latinum bars

### Key Mechanics

- **Simultaneous Orders**: All players submit orders secretly, then resolve together
- **Support**: Units can support attacks or defenses in adjacent territories
- **Retreats**: Dislodged units must retreat or disband
- **Builds**: Gain/lose units based on supply center control (Fall turns)

## Project Structure

```
star-trek-diplomacy/
├── backend/
│   ├── src/
│   │   ├── engine/           # Core game logic
│   │   │   ├── diplomacy-engine.js
│   │   │   ├── map-data.js
│   │   │   ├── faction-abilities.js
│   │   │   └── alliance-system.js
│   │   ├── api/              # REST endpoints
│   │   │   ├── game-routes.js
│   │   │   └── lobby-routes.js
│   │   ├── game-manager.js   # Game instance manager
│   │   └── index.js          # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Home.jsx
│   │   │   ├── Lobby.jsx
│   │   │   ├── Game.jsx
│   │   │   ├── OrderPanel.jsx
│   │   │   ├── StatusBar.jsx
│   │   │   └── map/
│   │   │       └── GameMap.jsx
│   │   ├── hooks/
│   │   │   └── useGameStore.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── shared/                   # Shared data structures
├── docs/                     # Documentation
└── README.md
```

## API Endpoints

### Lobby
- `POST /api/lobby/create` - Create new game lobby
- `GET /api/lobby/:id` - Get lobby info
- `POST /api/lobby/:id/join` - Join lobby
- `POST /api/lobby/:id/select-faction` - Choose faction
- `POST /api/lobby/:id/ready` - Toggle ready status
- `POST /api/lobby/:id/start` - Start game (host only)

### Game
- `GET /api/game/:id` - Get public game state
- `GET /api/game/:id/player/:faction` - Get player-specific state
- `POST /api/game/:id/orders` - Submit orders
- `POST /api/game/:id/retreats` - Submit retreat orders
- `POST /api/game/:id/builds` - Submit build/disband orders
- `GET /api/game/:id/history` - Get turn history

### Alliances
- `POST /api/game/:id/alliance/propose` - Propose alliance
- `POST /api/game/:id/alliance/respond` - Accept/reject proposal

## Deployment (Railway)

1. Create Railway project
2. Add PostgreSQL addon (optional, for persistence)
3. Deploy backend service from `/backend`
4. Deploy frontend as static site from `/frontend`
5. Set environment variables:
   - `FRONTEND_URL` on backend
   - `VITE_API_URL` on frontend

## Development Notes

### Balance Testing
The game has been extensively tested with AI simulations:
- 1000+ games simulated
- ~15% standard deviation across factions
- 63.5% of games end in allied victory
- Breen is "Turkey-style" kingmaker (hard to attack, hard to win solo)

### TODO
- [ ] 3D map visualization (Three.js)
- [ ] Private messaging system
- [ ] Turn timers
- [ ] Game persistence (database)
- [ ] Spectator mode
- [ ] Tutorial

## License

MIT

## Credits

- Based on Diplomacy by Allan B. Calhamer
- Star Trek universe owned by Paramount/CBS
- Built with Claude AI assistance
