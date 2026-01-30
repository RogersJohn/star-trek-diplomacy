# Game Rules - Star Trek Diplomacy

## Victory Conditions

### Solo Victory
Each faction has a unique supply center threshold for solo victory:

- **Federation**: 10 SC
- **Klingon**: 12 SC
- **Romulan**: 8 SC
- **Cardassian**: 14 SC
- **Ferengi**: 9 SC or 100 Latinum
- **Breen**: 18 SC
- **Gorn**: 9 SC

### Allied Victory
Two or more factions can form a secret alliance. If their combined supply centers meet the threshold (typically 24 SC), they win together.

### Draw
If no victory condition is met by year 2380, the game is a draw.

## Map Layout

### Three Layers
1. **Lower Hyperspace (Layer 1)**: Bypass routes for tactical movement
2. **Core Sector (Layer 2)**: Main battlefield with all 48 supply centers
3. **Upper Hyperspace (Layer 3)**: Additional flanking routes

### Movement Between Layers
- Units can move between layers at designated "transwarp nodes"
- Hyperspace movement allows bypassing blockades
- Core Sector contains all supply centers

## Game Phases

### 1. Spring Movement Phase
- All players submit orders simultaneously
- Orders are hidden until all submitted or timer expires
- Orders resolve simultaneously

### 2. Spring Retreat Phase (if needed)
- Dislodged units must retreat to adjacent empty territory
- Units that cannot retreat are disbanded

### 3. Fall Movement Phase
- Same as Spring Movement

### 4. Fall Retreat Phase (if needed)
- Same as Spring Retreat

### 5. Fall Build Phase
- Count supply centers controlled
- Gain units if SCs > units (up to difference)
- Lose units if units > SCs (disband difference)
- Build units only in home supply centers

## Order Types

### Hold
- Unit stays in place
- Provides defensive support (strength = 1)

### Move
- Unit attempts to move to adjacent territory
- Attack strength = 1
- Succeeds if strength > defender's strength
- Bounces if strengths equal

### Support
- Unit supports another unit's move or hold
- Adds +1 to supported unit's strength
- Support is cut if supporting unit is attacked (except from supported territory)

### Convoy (Future feature)
- Fleet transports army across non-adjacent territories

## Combat Resolution

### Basic Rules
1. Count all supports for each move
2. Compare attacking vs defending strength
3. Highest strength wins
4. Ties = bounce (no one moves)

### Support Cut
- Attack on supporting unit cuts support
- Exception: Attack from territory being supported doesn't cut

### Standoff
- Multiple equal-strength moves to same territory = standoff
- No one enters territory

## Dislodgement and Retreats

### When Dislodged
- Losing unit must retreat
- Can retreat to any adjacent unoccupied territory
- Cannot retreat to:
  - Territory it was attacked from
  - Territory involved in standoff
  - Occupied territory

### Disbanded Units
- Units that cannot retreat are destroyed
- Units voluntarily disbanded during build phase

## Builds and Disbands

### Building Units
- Can only build in unoccupied home supply centers
- Number of builds = SCs controlled - units on board
- Choose ship or troop for each build

### Disbanding Units
- Must disband if units > SCs
- Player chooses which units to disband

## Faction Abilities

### Federation - Diplomatic Immunity
- Once per game, prevent one of your units from being dislodged
- Activate during retreat phase
- Unit stays in place despite losing battle

### Klingon - Warrior's Rage
- Toggle ability on/off each turn
- While active:
  - +1 attack strength (when moving)
  - -1 defense strength (when attacked)

### Romulan - Tal Shiar
- Once per game, view one enemy faction's orders before resolution
- Use during order submission phase
- See all orders for chosen faction

### Cardassian - Obsidian Order
- Each turn, see destinations of all enemy moves (not supports/holds)
- Passive ability, always active
- Doesn't reveal supporting units

### Ferengi - Rules of Acquisition
- Earn latinum each turn (1 per SC controlled)
- Spend latinum on:
  - **Bribe (20 latinum)**: Reveal enemy's orders
  - **Sabotage (30 latinum)**: Cancel one enemy order
  - **Purchase SC (50 latinum)**: Buy neutral supply center
- Win if you accumulate 100 latinum

### Breen - Energy Dampening Field
- Once per game, "freeze" one territory
- No units can enter or leave frozen territory for 1 turn
- Units inside cannot give or receive support

### Gorn - Reptilian Resilience
- Passive ability: 50% chance destroyed units survive
- Applies to:
  - Dislodged units that cannot retreat
  - Units disbanded due to lack of supply centers
- Roll happens automatically

## Special Rules

### Home Supply Centers
- Each faction starts with 3-6 home SCs
- Can only build units in home SCs
- Controlling enemy home SCs prevents their builds

### Neutral Supply Centers
- Start unoccupied
- First faction to occupy gains control
- Can be captured by any faction

### Hyperspace Navigation
- Ships can move through hyperspace
- Troops cannot (unless convoyed - future feature)
- Some territories connect multiple layers

## Strategy Tips

### Early Game
- Secure nearby neutral SCs
- Form temporary alliances
- Position for mid-game expansion

### Mid Game
- Decide on alliances or solo victory
- Control key chokepoints
- Use faction abilities strategically

### Late Game
- Coordinate with allies for allied victory
- Block enemy expansion
- Time ability usage for maximum impact

## Diplomacy Mechanics

### Public Communication
- In-game chat (future feature)
- All players can see

### Private Messaging
- Direct messages between players (future feature)
- Use for alliance negotiations

### Alliance System
- Propose alliance to another player
- Requires mutual agreement
- Can be secret or public
- Can dissolve at any time

### Deception
- No rule against lying
- Break alliances if strategic
- Reputation matters for future games

## Turn Timer

- Default: 24 hours per turn
- Configurable by host
- Auto-submit hold orders if timer expires
- Pause option for multiplayer convenience (future feature)

## Elimination

### When Eliminated
- Faction has zero units and zero supply centers
- Player becomes spectator
- Can watch game continue

### After Elimination
- Territory remains empty
- Former supply centers can be captured
- No special penalties for eliminating player

## Game End

### Victory Announced
- Game ends immediately
- Winner(s) announced
- Statistics displayed

### Resignation
- Players can resign (future feature)
- Units and SCs abandoned
- Game continues

## Clarifications

### Move Order Priority
- All moves resolve simultaneously
- No "first mover advantage"

### Support Paradoxes
- Rare edge cases resolved by:
  1. Self-dislodgement rule
  2. Cut support takes priority

### Layer Interactions
- Units on different layers don't interact
- Must be on same layer to attack/support

## Variants (Future)

- **Speed Game**: 15-minute turns
- **Fog of War**: Limited visibility
- **Custom Maps**: Player-created maps
- **AI Players**: Computer-controlled factions
