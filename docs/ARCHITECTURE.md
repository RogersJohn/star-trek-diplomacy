# Star Trek Diplomacy - Architecture Documentation

## System Architecture

### Overview
Star Trek Diplomacy is a web-based multiplayer strategy game built on a client-server architecture.

```
┌─────────────────┐          ┌──────────────────┐
│                 │          │                  │
│  React Frontend │◄────────►│  Express Backend │
│   (Vite + React)│   HTTP   │   (Node.js)     │
│                 │          │                  │
└─────────────────┘          └──────────────────┘
        │                            │
        │                            │
        ▼                            ▼
   Browser State              In-Memory State
   (Zustand)                  (Game Manager)
```

## Backend Architecture

### Core Components

#### 1. Game Manager (`game-manager.js`)
- Manages multiple game instances
- Handles lobby creation and player joining
- Coordinates game lifecycle

#### 2. Diplomacy Engine (`engine/diplomacy-engine.js`)
- Core game logic
- Order validation and resolution
- Turn processing
- Victory condition checking

#### 3. Map System (`engine/map-data.js`)
- 3-layer map structure (Core + 2 Hyperspace layers)
- Territory adjacency
- Supply center data
- Starting positions

#### 4. Faction Abilities (`engine/faction-abilities.js`)
- Unique faction powers
- Ability activation and resolution
- Balance modifiers

#### 5. Alliance System (`engine/alliance-system.js`)
- Secret alliance proposals
- Combined victory conditions
- Alliance management

### API Structure

```
/api/lobby/*        - Lobby management
/api/game/*         - Game state and actions
/api/game/*/orders  - Order submission
/api/game/*/alliance - Alliance negotiations
```

## Frontend Architecture

### Component Hierarchy

```
App
├── Home
│   └── Create/Join lobby
├── Lobby
│   ├── Player list
│   ├── Faction selection
│   └── Ready status
└── Game
    ├── GameMap
    │   ├── Territory nodes
    │   └── Unit display
    ├── OrderPanel
    │   ├── Move orders
    │   ├── Support orders
    │   └── Special abilities
    └── StatusBar
        ├── Turn info
        ├── Player status
        └── Alliance options
```

### State Management (Zustand)

```javascript
gameStore
├── gameState      - Current game data
├── selectedTerritory
├── orderMode      - MOVE/SUPPORT/etc
└── actions
    ├── submitOrders()
    ├── useAbility()
    └── proposeAlliance()
```

## Game Flow

### 1. Lobby Phase
1. Host creates lobby
2. Players join and select factions
3. All players mark ready
4. Host starts game

### 2. Spring/Fall Turns
1. Players submit orders simultaneously
2. Backend validates orders
3. Orders resolve (supports, moves, bounces)
4. Units dislodged if necessary
5. Move to retreat phase (if needed) or next season

### 3. Retreat Phase
1. Dislodged units choose retreat location
2. Backend validates retreats
3. Units move or disband

### 4. Build Phase (Fall only)
1. Count supply centers
2. Players gain/lose units based on difference
3. Players choose build locations or units to disband

### 5. Victory Check
- Check solo victory conditions
- Check alliance victory conditions
- Check Ferengi latinum victory

## Data Models

### Game State
```javascript
{
  id: string,
  phase: 'lobby' | 'orders' | 'retreats' | 'builds',
  season: 'spring' | 'fall',
  year: number,
  factions: {
    [factionName]: {
      supplyCenters: number,
      units: [{ type, location, layer }],
      eliminated: boolean,
      abilityUsed: boolean
    }
  },
  orders: { [faction]: [...] },
  alliances: [...]
}
```

### Order Structure
```javascript
{
  type: 'move' | 'support' | 'hold' | 'convoy',
  unit: { type, location, layer },
  destination: string,
  supportedUnit: {...} // for support orders
}
```

## Security Considerations

1. **Order Privacy**: Players can only see their own orders until resolution
2. **Faction Abilities**: Some reveal enemy information (Romulan, Cardassian)
3. **Validation**: All orders validated server-side
4. **Rate Limiting**: Prevent spam on endpoints

## Performance Considerations

1. **In-Memory State**: Fast for prototyping, needs database for production
2. **Order Resolution**: O(n²) complexity, acceptable for 7 players
3. **Map Rendering**: SVG-based, could optimize with Canvas for 3D version

## Future Architecture Changes

### Database Layer
```
┌─────────┐
│PostgreSQL│
└────┬────┘
     │
┌────▼────────────┐
│  Sequelize ORM  │
└────┬────────────┘
     │
┌────▼────────────┐
│   Backend       │
└─────────────────┘
```

### WebSocket Integration
```
┌─────────┐          ┌──────────┐
│ Frontend│◄────────►│Socket.IO │
└─────────┘  Real-   └────┬─────┘
              time        │
                    ┌─────▼──────┐
                    │  Backend   │
                    └────────────┘
```

### Scaling Strategy
- Horizontal scaling with Redis session store
- Load balancer for multiple backend instances
- Separate game servers by lobby ID
- CDN for static assets

## Testing Strategy

1. **Unit Tests**: Core game logic (order resolution, victory conditions)
2. **Integration Tests**: API endpoints
3. **E2E Tests**: Complete game flows
4. **Balance Testing**: AI simulations (already completed)

## Deployment

### Railway (Current)
- Backend: Node.js service
- Frontend: Static site
- Environment variables for configuration

### Docker (Recommended for Production)
```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
  frontend:
    build: ./frontend
    ports: ["80:80"]
  postgres:
    image: postgres:15
    volumes: [./data:/var/lib/postgresql/data]
```

## Development Workflow

1. Feature branch from `main`
2. Local development with hot reload
3. Manual testing
4. Pull request with description
5. Code review
6. Merge to `main`
7. Auto-deploy to staging (future)
8. Manual promotion to production (future)
