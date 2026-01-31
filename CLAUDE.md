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

**Current state:**
- Backend engine: ~90% complete, tested via 1000+ AI simulations
- Frontend: ~40% complete, scaffolded but not wired up
- No persistence (games lost on server restart)
- No authentication
- No real-time messaging

**Tech stack:**
- Backend: Node.js, Express, Socket.io
- Frontend: React 18, Vite, Tailwind CSS, Zustand
- Planned: PostgreSQL for persistence, Three.js for 3D map

---

## Development Roadmap

Complete in order. Each phase = 1 PR. Don't skip ahead.

### Phase 1: Fix What's Broken
**Goal:** App runs locally without errors

- [ ] Fix shared map-data.js import paths (frontend can't find it)
- [ ] Verify backend starts: `cd backend && npm run dev`
- [ ] Verify frontend starts: `cd frontend && npm run dev`
- [ ] Fix any import/export mismatches between CommonJS and ESM
- [ ] Test: Create lobby → Join lobby → Select faction → Start game
- [ ] Test: Basic order submission flow works

**PR title:** "fix: resolve startup errors and import paths"

---

### Phase 2: Complete 2D Map Interaction
**Goal:** Players can see the map and issue orders by clicking

- [ ] Fix GameMap.jsx to properly render all core layer systems
- [ ] Implement click-to-select-unit → click-destination-to-move
- [ ] Show valid move destinations when unit selected (highlight adjacent)
- [ ] Display unit ownership colors correctly
- [ ] Add support order UI (select unit → select support target → select destination)
- [ ] Add hold order button for selected units
- [ ] Show pending orders visually on map (arrows for moves)

**PR title:** "feat: complete 2D map interaction and order input"

---

### Phase 3: Order Submission & Resolution Display
**Goal:** Full turn cycle works

- [ ] Submit orders button sends to backend correctly
- [ ] Show "waiting for players" state with who has submitted
- [ ] When all orders in, display resolution results
- [ ] Animate or highlight successful moves vs bounces
- [ ] Handle retreat phase UI (select retreat destination or disband)
- [ ] Handle build phase UI (select home system to build, or unit to disband)
- [ ] Auto-advance to next turn after resolution

**PR title:** "feat: complete turn cycle with resolution display"

---

### Phase 4: Game State Polish
**Goal:** Game feels playable

- [ ] Victory detection and winner screen
- [ ] Elimination handling (removed players can spectate)
- [ ] Supply center count display per faction
- [ ] Turn history panel (expandable, shows past orders)
- [ ] Current orders summary before submit
- [ ] Confirmation dialog before submitting orders

**PR title:** "feat: victory conditions and game state polish"

---

### Phase 5: Real-time Messaging
**Goal:** Players can negotiate (the "Diplomacy" part)

- [ ] Private message panel (select recipient faction)
- [ ] Message history per conversation
- [ ] Unread message indicator
- [ ] Public broadcast channel (optional)
- [ ] Socket.io integration for real-time delivery
- [ ] Message notifications

**PR title:** "feat: in-game messaging system"

---

### Phase 6: Faction Abilities UI
**Goal:** All 7 abilities usable in-game

- [ ] Federation: "Use Diplomatic Immunity" button when unit about to be dislodged
- [ ] Klingon: Passive, just display +1/-1 modifier info
- [ ] Romulan: Show revealed enemy orders before resolution
- [ ] Cardassian: Show enemy move destinations in UI
- [ ] Ferengi: Latinum display, Bribe/Sabotage action buttons
- [ ] Breen: "Freeze Territory" targeting UI
- [ ] Gorn: Show survival roll results when unit would die

**PR title:** "feat: faction ability UI and interactions"

---

### Phase 7: Alliance System UI
**Goal:** Secret alliances work in-game

- [ ] "Propose Alliance" button with faction selector
- [ ] Incoming proposal notification and accept/reject
- [ ] Alliance status display (your ally, alliance type)
- [ ] Combined SC counter for alliance victory tracking
- [ ] "Break Alliance" option with confirmation
- [ ] Alliance victory announcement

**PR title:** "feat: alliance proposal and management UI"

---

### Phase 8: Database Persistence
**Goal:** Games survive server restarts

- [ ] Add PostgreSQL (or SQLite for simpler setup)
- [ ] Schema: games, players, turns, orders, messages
- [ ] Save game state after each phase resolution
- [ ] Load game state on server start
- [ ] Reconnection handling (player rejoins mid-game)
- [ ] Game listing (see your active games)

**PR title:** "feat: database persistence for game state"

---

### Phase 9: Authentication
**Goal:** Real user accounts

- [ ] Add Clerk or Auth0 (don't roll your own)
- [ ] Login/register flow
- [ ] Associate games with user accounts
- [ ] Player profiles (game history, win rate)
- [ ] Prevent impersonation in lobbies

**PR title:** "feat: user authentication"

---

### Phase 10: Turn Timers
**Goal:** Games don't stall

- [ ] Configurable turn timer (default 24h)
- [ ] Countdown display
- [ ] Auto-submit hold orders if timer expires
- [ ] Warning notification when time running low
- [ ] Pause/resume for async games (host control)

**PR title:** "feat: turn timers with auto-resolution"

---

### Phase 11: 3D Map (Optional Enhancement)
**Goal:** Visual wow factor

- [ ] Three.js / React Three Fiber setup
- [ ] Render all 3 layers as 3D space
- [ ] Hyperlane connections as glowing lines
- [ ] Camera controls (orbit, zoom, pan)
- [ ] Click detection for unit selection
- [ ] Layer visibility toggles
- [ ] Performance optimization

**PR title:** "feat: 3D map visualization"

---

### Phase 12: Mobile Optimization
**Goal:** Playable on phones

- [ ] Responsive layout for all screens
- [ ] Touch-friendly order input
- [ ] Collapsible panels
- [ ] Bottom sheet for orders on mobile
- [ ] Test on iOS Safari and Android Chrome

**PR title:** "feat: mobile-responsive design"

---

### Phase 13: Deployment
**Goal:** Live on the internet

- [ ] Railway configuration (or Render, Fly.io)
- [ ] Environment variable setup
- [ ] Production build pipeline
- [ ] Domain setup (optional)
- [ ] Basic monitoring/logging

**PR title:** "chore: production deployment configuration"

---

## Code Standards

**File organization:**
- One component per file
- Hooks in `/hooks`
- API calls centralized in store or `/api` folder
- No business logic in components - keep them dumb

**Naming:**
- Components: PascalCase
- Files: kebab-case or match component name
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

**Testing:**
- Backend: Jest for engine logic
- Frontend: Manual testing fine for MVP, add tests later

**Commits:**
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- One logical change per commit
- PR should be reviewable in <30 minutes

---

## Known Issues to Fix

1. `shared/map-data.js` uses mixed CommonJS/ESM exports - pick one
2. Frontend `GameMap.jsx` imports from `../../../../shared/` - wrong path
3. No error boundaries in React components
4. Socket.io reconnection not handled
5. No loading states in UI
6. Hardcoded localhost URLs need env vars

---

## Don't Do These Things

- Don't add features not in the current phase
- Don't refactor unrelated code while fixing a bug
- Don't add dependencies without justification
- Don't write "// TODO" comments - either do it or create an issue
- Don't commit console.logs
- Don't make the PR too big - split if >500 lines changed

---

## Questions to Ask Before Starting

1. Which phase am I working on?
2. Is the previous phase complete and merged?
3. Do I understand the acceptance criteria?
4. Are there any blockers I should raise first?
