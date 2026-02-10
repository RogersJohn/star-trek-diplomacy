# CLAUDE.md - Star Trek Diplomacy Development Guide

## Communication Style

**Be direct and technical. No flattery, no "great question!", no "I'd be happy to help!"**

- If code is broken, say it's broken and why
- If an approach is suboptimal, say so and propose better
- If you don't know something, say "I don't know"
- If a request is unclear, ask for clarification rather than guessing
- Disagreement is fine - push back when you have a better idea
- Don't apologize excessively - fix the problem and move on

**When reviewing code:**
- Point out bugs, inefficiencies, and anti-patterns directly
- "This works but..." is better than "Great job! One small thing..."
- Suggest refactors when code is messy, don't just patch around it

---

## Project Context

**What this is:** A 7-player Diplomacy-style strategy game with Star Trek factions. Turn-based, simultaneous order resolution, secret alliances, asymmetric abilities.

**Current state: v2 implemented, working on v2.1 rebalance.**

See **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for the current development plan. All work should follow that plan.

**Tech stack:**
- Backend: Node.js, Express, Socket.io, PostgreSQL
- Frontend: React 18, Vite, Tailwind CSS, Zustand
- Auth: Clerk (required for all environments)
- Database: PostgreSQL (Railway-compatible)
- 3D Map: Three.js / React Three Fiber

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Backend: backend/.env
#   - DATABASE_URL=postgresql://...
#   - CLERK_SECRET_KEY=sk_...

# Frontend: frontend/.env
#   - VITE_CLERK_PUBLISHABLE_KEY=pk_...

# 3. Start development servers
npm run dev:backend   # Port 3000
npm run dev:frontend  # Port 5173

# 4. Run Docker integration tests
npm run test:docker
```

---

## Architecture Overview

### Authentication Flow
1. User signs in via Clerk on frontend
2. Frontend gets JWT token via `useAuth().getToken()`
3. All API calls include `Authorization: Bearer <token>`
4. Backend verifies token via `@clerk/clerk-sdk-node`
5. Socket.io connections also authenticated via token

### Database Schema
- `users` - Clerk user IDs and display names
- `games` - Game state JSON, turn info, settings
- `game_players` - Authoritative user-to-faction mapping
- `user_games` - User's game history

### Key Files
- `backend/src/index.js` - Express + Socket.io server
- `backend/src/game-manager.js` - Game state orchestration
- `backend/src/engine/diplomacy-engine.js` - Core game rules
- `backend/src/engine/faction-abilities.js` - Faction powers
- `frontend/src/hooks/useGameStore.js` - Zustand state management
- `frontend/src/components/map/GameMap.jsx` - Map rendering (2D currently, 3D in v2)
- `shared/map-data.js` - Map topology (npm workspace package)
- `shared/edge-utils.js` - Edge ID generation and parsing (v2)

---

## v2 Game Model

### Unit Types and Positions

| Unit Type | Can Occupy | Capacity Rules |
|-----------|------------|----------------|
| **Army** | Planet (node) | 1 army per planet |
| **Fleet** | Planet orbit OR Hyperlane (edge) | 1 fleet per planet orbit, 2 allied fleets per hyperlane |

### Position Notation

- **Planet positions:** `earth`, `vulcan`, `qonos` (existing node IDs)
- **Orbit positions:** `earth:orbit`, `vulcan:orbit` (planet ID + `:orbit` suffix)
- **Hyperlane positions:** `earth~vulcan` (alphabetically sorted, tilde separator)

Hyperlane IDs are always sorted alphabetically: `earth~vulcan` not `vulcan~earth`. This prevents duplicate edge representations.

### Movement Rules

| Unit | From | To | Order Type |
|------|------|-----|------------|
| Army | Planet | Adjacent planet | MOVE |
| Army | Planet | Same planet (defend) | HOLD |
| Fleet | Orbit | Adjacent hyperlane | MOVE |
| Fleet | Orbit | Same orbit (defend) | HOLD |
| Fleet | Hyperlane | Adjacent hyperlane | MOVE |
| Fleet | Hyperlane | Endpoint planet orbit | MOVE |
| Fleet | Hyperlane | Hold position | HOLD |

### Support Rules

| Supporter | Can Support |
|-----------|-------------|
| Army on planet | Army moving to/holding adjacent planet |
| Fleet in orbit | Army on same planet, Fleet on adjacent hyperlane |
| Fleet on hyperlane | Army on either endpoint planet, Fleet on adjacent hyperlane, Fleet in either endpoint orbit |

### Combat Rules

- Armies fight armies (for planet control)
- Fleets fight fleets (for space control)
- Fleets in orbit can be attacked by fleets on adjacent hyperlanes
- An army without a supporting fleet in orbit is easier to dislodge (-1 defense if no friendly fleet in orbit)

### Convoy Rules

Fleets on hyperlanes can convoy armies across non-adjacent planets:
- Army at Planet A orders: `MOVE to Planet C via convoy`
- Fleet on hyperlane A~B orders: `CONVOY Army from A to C`
- Fleet on hyperlane B~C orders: `CONVOY Army from A to C`
- If convoy chain is unbroken, army moves from A to C

### Supply Center Control

- A planet's supply center is controlled by the faction whose **army** occupies it at the end of Fall
- Fleets in orbit do NOT capture supply centers
- This creates strategic tension: you need armies to hold territory, fleets to project power

### Build Rules

- **Armies:** Built on home planet supply centers (must be unoccupied by army)
- **Fleets:** Built in orbit of home planet supply centers (must be unoccupied by fleet)
- You can build both an army AND a fleet at the same home planet if both positions are empty

### Hyperlane Capacity

- A hyperlane can hold **2 fleets maximum**
- Both fleets must be **allied** (same faction OR formal alliance)
- If two enemy fleets end up on the same hyperlane, they fight immediately (higher strength stays, loser retreats)

---

## Code Standards

**File organization:**
- One component per file
- Hooks in `/hooks`
- API calls centralized in useGameStore
- No business logic in components

**Naming:**
- Components: PascalCase
- Files: kebab-case or match component name
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

**Testing:**
- Backend: Jest (`npm test` in backend folder)
- E2E: Docker integration tests (`npm run test:docker`)

**Commits:**
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- One logical change per commit
- No `// TODO` comments
- No `console.log` in production code
- All tests must assert real behavior
- Run tests after each section

---

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:pass@localhost:5432/star_trek_diplomacy
CLERK_SECRET_KEY=sk_test_...
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Deployment

### Railway (Recommended)
1. Connect GitHub repo
2. Add PostgreSQL addon (provides DATABASE_URL)
3. Set environment variables in Railway dashboard
4. Backend deploys from `backend/Dockerfile`
5. Frontend deploys from `frontend/Dockerfile`

### Docker Compose (Local)
```bash
# Set CLERK keys in environment
docker-compose up --build
```

---

## v2.1 Changelog

### Balance Changes
- Klingon: +1 attack on first move only (was all moves). Defense penalty only without fleet in orbit.
- Gorn: Deterministic resilience (was 50% random). Only triggers when no valid retreats.
- Romulan: Choose spy target each turn, see all their orders (was 1-2 random orders).
- Ferengi: Income 3/SC (was 0.5), bribe 10 (was 15), sabotage 15 (was 25), new espionage ability (8). Victory at 50 latinum (was 100).

### Data Fixes
- Breen: breen_citadel and breen_fortress are no longer marked as home systems in map-data.js (still Breen supply centers)
- Latinum economy is now Ferengi-exclusive (was bugged to give all factions income)
- Non-adjacent army moves are now flagged as requiring convoy at validation time
- Duplicate order detection added

### UX Improvements
- SVG zoom/pan on 2D map
- Always-visible labels for supply centers
- Orbit rings around planets
- Wider hyperlane click targets
- Individual order undo
- Hyperspace layer toggle
- Phase/turn overlay on map

---

## Don't Do These Things

- Don't bypass Clerk auth - there is no dev mode
- Don't trust client-provided faction - always verify via database
- Don't add features without updating tests
- Don't commit .env files or secrets
- Don't make PRs > 500 lines without splitting
- Don't skip phases in the IMPLEMENTATION_PLAN.md order
- Don't write placeholder tests - every test must assert real behavior

---

## Troubleshooting

**"Authentication required" errors:**
- Check CLERK_SECRET_KEY is set in backend
- Check VITE_CLERK_PUBLISHABLE_KEY is set in frontend
- Ensure Clerk keys are from same Clerk application

**Socket.io connection fails:**
- Check FRONTEND_URL in backend matches actual frontend origin
- Verify token is being passed in socket auth

**Database connection fails:**
- Check DATABASE_URL format: `postgresql://user:pass@host:5432/dbname`
- Ensure PostgreSQL is running
