# GitHub Repository Setup Guide

## Your repository has been initialized locally! 🎉

All files have been committed and you're ready to push to GitHub.

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub CLI (Recommended)
```powershell
# Install GitHub CLI if not already installed
# winget install --id GitHub.cli

# Authenticate (if not already done)
gh auth login

# Create the repository
cd C:\Users\roger\GitHub\star-trek-diplomacy
gh repo create star-trek-diplomacy --public --source=. --remote=origin --push

# This will:
# 1. Create the repo on GitHub
# 2. Add it as remote 'origin'
# 3. Push your code automatically
```

### Option B: Using GitHub Website
1. Go to https://github.com/new
2. Repository name: `star-trek-diplomacy`
3. Description: "A 7-player grand strategy game set in the Star Trek universe, based on Diplomacy mechanics"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have them)
6. Click "Create repository"

Then run:
```powershell
cd C:\Users\roger\GitHub\star-trek-diplomacy
git remote add origin https://github.com/YOUR-USERNAME/star-trek-diplomacy.git
git branch -M main
git push -u origin main
```

---

## Step 2: Configure Repository Settings

### Branch Protection
1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution before merging

### Secrets (for GitHub Actions)
1. Go to Settings → Secrets and variables → Actions
2. Add these secrets if using Railway:
   - `RAILWAY_TOKEN` - Your Railway API token
   - `VITE_API_URL` - Your production API URL

### Topics (for discoverability)
Add these topics to your repository:
- `star-trek`
- `diplomacy`
- `strategy-game`
- `multiplayer`
- `nodejs`
- `react`
- `game-development`

---

## Step 3: Enable GitHub Features

### Issues
1. Go to Settings → General → Features
2. ✅ Enable Issues
3. Create issue templates:
   - Bug report
   - Feature request
   - Question

### Projects
1. Create a new Project
2. Add these columns:
   - 📋 Backlog
   - 🚀 In Progress
   - ✅ Done
3. Link to the roadmap in docs/ROADMAP.md

### Discussions (Optional)
1. Enable Discussions for community engagement
2. Categories:
   - Announcements
   - General
   - Strategy & Tips
   - Development
   - Show & Tell

---

## Step 4: Local Development Setup

### Environment Files
```powershell
# Backend
cd backend
cp .env.example .env
# Edit .env with your local settings

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your local settings
```

### Install Dependencies
```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Run Development Servers
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Step 5: Verify Everything Works

### Test Locally
1. ✅ Create a lobby
2. ✅ Join with multiple browser tabs
3. ✅ Select different factions
4. ✅ Start a game
5. ✅ Submit orders
6. ✅ Verify turn resolution

### Check CI/CD
1. Push a small change to test GitHub Actions
2. Verify workflows run successfully
3. Check for any linting or build errors

---

## Step 6: Documentation Updates

### Update README.md
Replace the placeholder username in clone instructions:
```bash
git clone https://github.com/YOUR-USERNAME/star-trek-diplomacy.git
```

### Add Repository URL to Package.json
```powershell
# Backend package.json
cd backend
# Add: "repository": "github:YOUR-USERNAME/star-trek-diplomacy"

# Frontend package.json
cd ../frontend
# Add: "repository": "github:YOUR-USERNAME/star-trek-diplomacy"
```

---

## Step 7: First Contribution Workflow

### Create Development Branch
```powershell
git checkout -b develop
git push -u origin develop
```

### Make Changes
```powershell
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ...

# Commit
git add .
git commit -m "feat: add your feature description"

# Push
git push -u origin feature/your-feature-name
```

### Create Pull Request
```powershell
# Using GitHub CLI
gh pr create --base develop --title "Add your feature" --body "Description of changes"

# Or go to GitHub website and create PR manually
```

---

## Recommended Git Workflow

### Branch Strategy
```
main (production)
  ↓
develop (integration)
  ↓
feature/*, bugfix/*, hotfix/* (development)
```

### Commit Message Convention
```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

### Before Each Commit
```powershell
# Run linting
cd backend && npm run lint
cd ../frontend && npm run lint

# Format code
npx prettier --write .

# Test (when tests are added)
npm test
```

---

## Helpful Git Commands

### Status & Information
```powershell
git status                    # Check current status
git log --oneline --graph     # View commit history
git branch -a                 # List all branches
git remote -v                 # View remotes
```

### Synchronization
```powershell
git fetch origin             # Fetch changes
git pull origin main         # Pull main branch
git push origin main         # Push to main
```

### Undoing Changes
```powershell
git checkout -- <file>       # Discard changes to file
git reset HEAD <file>        # Unstage file
git revert <commit>          # Revert commit
```

### Cleaning
```powershell
git clean -fd                # Remove untracked files
```

---

## Next Steps

1. ✅ Push to GitHub
2. ⬜ Deploy to Railway (see docs/DEPLOYMENT.md)
3. ⬜ Share repository link
4. ⬜ Invite collaborators
5. ⬜ Start working on roadmap items

---

## Resources

- [GitHub Docs](https://docs.github.com)
- [Git Documentation](https://git-scm.com/doc)
- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions](https://docs.github.com/actions)

---

## Questions?

If you encounter any issues:
1. Check GitHub's status page
2. Review error messages carefully
3. Search GitHub Community
4. Open an issue in the repository

---

**Happy coding! 🖖**
