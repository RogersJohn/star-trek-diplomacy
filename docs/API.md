# API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-app.railway.app`

## Authentication
Currently, no authentication is implemented. Players are identified by lobby/game ID and faction selection.

**Future**: JWT-based authentication for persistent accounts.

---

## Lobby Endpoints

### Create Lobby
```http
POST /api/lobby/create
```

**Request Body:**
```json
{
  "hostName": "Player1",
  "settings": {
    "turnTimeLimit": 1440,
    "enableAI": false
  }
}
```

**Response:**
```json
{
  "lobbyId": "abc123",
  "hostId": "player-uuid"
}
```

---

### Get Lobby Info
```http
GET /api/lobby/:id
```

**Response:**
```json
{
  "id": "abc123",
  "host": "player-uuid",
  "players": [
    {
      "id": "player-uuid",
      "name": "Player1",
      "faction": "federation",
      "ready": true
    }
  ],
  "status": "waiting",
  "settings": {
    "turnTimeLimit": 1440
  }
}
```

---

### Join Lobby
```http
POST /api/lobby/:id/join
```

**Request Body:**
```json
{
  "playerName": "Player2"
}
```

**Response:**
```json
{
  "playerId": "player-uuid-2",
  "lobbyId": "abc123"
}
```

---

### Select Faction
```http
POST /api/lobby/:id/select-faction
```

**Request Body:**
```json
{
  "playerId": "player-uuid",
  "faction": "klingon"
}
```

**Response:**
```json
{
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Faction already taken"
}
```

---

### Toggle Ready Status
```http
POST /api/lobby/:id/ready
```

**Request Body:**
```json
{
  "playerId": "player-uuid",
  "ready": true
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Start Game
```http
POST /api/lobby/:id/start
```

**Request Body:**
```json
{
  "playerId": "host-uuid"
}
```

**Response:**
```json
{
  "gameId": "game-uuid",
  "success": true
}
```

---

## Game Endpoints

### Get Game State
```http
GET /api/game/:id
```

**Response:**
```json
{
  "id": "game-uuid",
  "phase": "orders",
  "season": "spring",
  "year": 2373,
  "factions": {
    "federation": {
      "supplyCenters": 5,
      "units": [
        {
          "type": "ship",
          "location": "earth",
          "layer": 2
        }
      ],
      "eliminated": false
    }
  },
  "map": {
    "territories": [...],
    "supplyCenters": [...]
  }
}
```

---

### Get Player-Specific State
```http
GET /api/game/:id/player/:faction
```

**Response:**
```json
{
  "yourOrders": [...],
  "visibleEnemyOrders": [...],
  "abilities": {
    "available": true,
    "used": false,
    "description": "Diplomatic Immunity"
  },
  "latinum": 15
}
```

---

### Submit Orders
```http
POST /api/game/:id/orders
```

**Request Body:**
```json
{
  "faction": "federation",
  "orders": [
    {
      "type": "move",
      "unit": {
        "type": "ship",
        "location": "earth",
        "layer": 2
      },
      "destination": "vulcan"
    },
    {
      "type": "support",
      "unit": {
        "type": "ship",
        "location": "andoria",
        "layer": 2
      },
      "supportedUnit": {
        "type": "ship",
        "location": "earth",
        "layer": 2
      },
      "supportedDestination": "vulcan"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "validated": true
}
```

**Error Response:**
```json
{
  "error": "Invalid order: Cannot move ship from earth to vulcan (not adjacent)",
  "orderIndex": 0
}
```

---

### Submit Retreat Orders
```http
POST /api/game/:id/retreats
```

**Request Body:**
```json
{
  "faction": "federation",
  "retreats": [
    {
      "unit": {
        "type": "ship",
        "location": "vulcan",
        "layer": 2
      },
      "destination": "andoria"
    }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Submit Build/Disband Orders
```http
POST /api/game/:id/builds
```

**Request Body:**
```json
{
  "faction": "federation",
  "builds": [
    {
      "type": "ship",
      "location": "earth"
    }
  ],
  "disbands": [
    {
      "type": "troop",
      "location": "farpoint"
    }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Use Faction Ability
```http
POST /api/game/:id/ability
```

**Request Body:**
```json
{
  "faction": "romulan",
  "abilityType": "tal_shiar",
  "target": "klingon"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "revealedOrders": [...]
  }
}
```

---

### Get Turn History
```http
GET /api/game/:id/history
```

**Query Parameters:**
- `startTurn` (optional): Starting turn number
- `endTurn` (optional): Ending turn number

**Response:**
```json
{
  "history": [
    {
      "season": "spring",
      "year": 2373,
      "orders": [...],
      "resolution": [...],
      "events": [
        "Federation ship moved from Earth to Vulcan",
        "Klingon troop dislodged from Qo'noS"
      ]
    }
  ]
}
```

---

## Alliance Endpoints

### Propose Alliance
```http
POST /api/game/:id/alliance/propose
```

**Request Body:**
```json
{
  "proposer": "federation",
  "target": "romulan",
  "terms": {
    "secret": true,
    "victoryThreshold": 18
  }
}
```

**Response:**
```json
{
  "allianceId": "alliance-uuid",
  "success": true
}
```

---

### Respond to Alliance
```http
POST /api/game/:id/alliance/respond
```

**Request Body:**
```json
{
  "allianceId": "alliance-uuid",
  "faction": "romulan",
  "accept": true
}
```

**Response:**
```json
{
  "success": true,
  "alliance": {
    "factions": ["federation", "romulan"],
    "active": true
  }
}
```

---

### Break Alliance
```http
POST /api/game/:id/alliance/break
```

**Request Body:**
```json
{
  "allianceId": "alliance-uuid",
  "faction": "federation"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Error Responses

All endpoints may return standard error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `LOBBY_NOT_FOUND`
- `GAME_NOT_FOUND`
- `INVALID_FACTION`
- `NOT_YOUR_TURN`
- `INVALID_ORDER`
- `ABILITY_ALREADY_USED`
- `INSUFFICIENT_LATINUM`

---

## WebSocket Events (Future)

### Connection
```javascript
const socket = io('http://localhost:3000');
socket.emit('join-game', { gameId, faction });
```

### Events
- `game-updated`: Game state changed
- `orders-submitted`: Player submitted orders
- `turn-resolved`: Turn completed
- `player-joined`: New player joined
- `player-left`: Player disconnected
- `message-received`: Chat message

---

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per IP
- WebSocket connections: Max 5 per user

---

## Future Endpoints

### Player Accounts
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/player/profile`
- `GET /api/player/stats`

### Game Management
- `POST /api/game/:id/pause`
- `POST /api/game/:id/resign`
- `GET /api/games/active`
- `GET /api/games/completed`

### Social Features
- `POST /api/game/:id/message`
- `GET /api/game/:id/messages`
- `POST /api/player/friend-request`
