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

**Current state (Beta):**
- Backend engine: Complete with all faction abilities
- Frontend: Functional with 2D map, order panel, messaging
- Database: PostgreSQL persistence for games and users
- Authentication: Clerk integration (required)
- Real-time: Socket.io for messaging and game updates
- Turn timers: Implemented with kick voting for delinquent players

**Tech stack:**
- Backend: Node.js, Express, Socket.io, PostgreSQL
- Frontend: React 18, Vite, Tailwind CSS, Zustand
- Auth: Clerk (required for all environments)
- Database: PostgreSQL (Railway-compatible)

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
- `frontend/src/components/map/GameMap.jsx` - 2D map rendering
- `shared/map-data.js` - Map topology (npm workspace package)

---

## Completed Features

### Core Gameplay
- [x] 7 factions with asymmetric abilities
- [x] Simultaneous order resolution (move, support, hold)
- [x] Retreat and build phases
- [x] Victory conditions per faction
- [x] Alliance system with proposal/accept/break

### Faction Abilities
- [x] Federation: Diplomatic Immunity (prevent dislodge)
- [x] Klingon: Warrior's Rage (+1 attack, -1 defense)
- [x] Romulan: Tal Shiar Intel (reveal enemy orders)
- [x] Cardassian: Obsidian Order (see move destinations)
- [x] Ferengi: Latinum economy, bribe/sabotage
- [x] Breen: Energy Dampening (freeze territory)
- [x] Gorn: Reptilian Resilience (50% survival)

### Infrastructure
- [x] Clerk authentication
- [x] PostgreSQL persistence
- [x] Socket.io real-time updates
- [x] Turn timers with kick voting
- [x] Docker configuration

---

## Remaining Work

### High Priority
- [ ] Update E2E tests for Clerk (currently broken)
- [ ] Add error boundaries to React components
- [ ] Mobile-responsive layout improvements

### Nice to Have
- [ ] 3D map visualization (Three.js)
- [ ] AI players for testing
- [ ] Spectator mode
- [ ] Game replay system

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
- E2E: Selenium (needs Clerk test users setup)

**Commits:**
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- One logical change per commit

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

## Don't Do These Things

- Don't bypass Clerk auth - there is no dev mode
- Don't trust client-provided faction - always verify via database
- Don't add features without updating tests
- Don't commit .env files or secrets
- Don't make PRs > 500 lines without splitting

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
