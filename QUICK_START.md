# 🚀 Quick Start Reference

## First Time Setup

### 1. Push to GitHub
```powershell
# Using GitHub CLI (easiest)
gh repo create star-trek-diplomacy --public --source=. --remote=origin --push

# OR manually
# 1. Create repo at github.com/new
# 2. Then run:
git remote add origin https://github.com/YOUR-USERNAME/star-trek-diplomacy.git
git branch -M main
git push -u origin main
```

### 2. Setup Environment
```powershell
# Backend
cd backend
cp .env.example .env
npm install

# Frontend  
cd ../frontend
cp .env.example .env
npm install
```

### 3. Run Development
```powershell
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Visit: http://localhost:5173

---

## Daily Development

### Start Coding
```powershell
cd C:\Users\roger\GitHub\star-trek-diplomacy
git pull origin main
git checkout -b feature/your-feature
code .  # Opens VS Code
```

### Save Progress
```powershell
git add .
git commit -m "feat: description of changes"
git push -u origin feature/your-feature
```

### Create Pull Request
```powershell
gh pr create --base main --title "Your feature" --body "What changed"
```

---

## Common Commands

### Git
```powershell
git status              # What changed?
git diff               # See changes
git log --oneline      # History
git branch            # List branches
```

### npm
```powershell
npm install           # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check code style
```

### Docker
```powershell
docker-compose up -d     # Start all services
docker-compose logs -f   # View logs
docker-compose down      # Stop services
```

---

## Project Structure

```
star-trek-diplomacy/
├── backend/              # Express API server
│   ├── src/
│   │   ├── engine/      # Game logic
│   │   ├── api/         # REST endpoints
│   │   └── index.js     # Server entry
│   └── package.json
├── frontend/             # React app
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # React hooks
│   │   └── main.jsx     # App entry
│   └── package.json
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD
└── docker-compose.yml    # Container setup
```

---

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | Main documentation |
| `GITHUB_SETUP.md` | GitHub setup instructions |
| `CONTRIBUTING.md` | How to contribute |
| `docs/ROADMAP.md` | Development roadmap |
| `docs/API.md` | API documentation |
| `docs/GAME_RULES.md` | Game rules |
| `.env.example` | Environment template |

---

## Useful Links

- 📖 [Full Documentation](./docs/)
- 🐛 [Report Bug](https://github.com/YOUR-USERNAME/star-trek-diplomacy/issues)
- 💡 [Request Feature](https://github.com/YOUR-USERNAME/star-trek-diplomacy/issues)
- 🚀 [Deployment Guide](./docs/DEPLOYMENT.md)

---

## Troubleshooting

### Backend won't start
```powershell
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend won't start
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Git issues
```powershell
git status               # Check what's wrong
git fetch origin         # Update references
git reset --hard origin/main  # Nuclear option (careful!)
```

### Port already in use
```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <pid> /F
```

---

## Quick Deploy

### Railway
```powershell
npm install -g @railway/cli
railway login
railway init
railway up
```

### Docker
```powershell
docker-compose up -d
```

---

## Testing Checklist

- [ ] Create lobby
- [ ] Join as 2+ players
- [ ] Select factions
- [ ] Start game
- [ ] Submit orders
- [ ] Test faction ability
- [ ] Check turn resolution
- [ ] Test alliance system

---

## Need Help?

1. Check [GITHUB_SETUP.md](./GITHUB_SETUP.md)
2. Read [docs/](./docs/)
3. Open an issue
4. Check git status: `git status`

---

**Happy coding! 🖖**
