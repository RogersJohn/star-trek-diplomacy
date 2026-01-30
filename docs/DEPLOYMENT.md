# Deployment Guide

## Railway Deployment

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway

### Setup Steps

1. **Create New Project**
   ```bash
   railway login
   railway init
   ```

2. **Add Services**
   - Backend Service (from `/backend`)
   - Frontend Service (from `/frontend`)
   - PostgreSQL Database (optional)

3. **Configure Backend Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://your-frontend.railway.app
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SESSION_SECRET=<generate-secure-random-string>
   ```

4. **Configure Frontend Environment Variables**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Automatic Deployments
- Connect GitHub repository
- Enable auto-deploy on push to `main` branch
- Railway will automatically build and deploy

---

## Docker Deployment

### Using Docker Compose

1. **Build and Run**
   ```bash
   docker-compose up -d
   ```

2. **Access Services**
   - Frontend: http://localhost:80
   - Backend: http://localhost:3000
   - PostgreSQL: localhost:5432

3. **View Logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop Services**
   ```bash
   docker-compose down
   ```

### Individual Docker Containers

**Backend:**
```bash
cd backend
docker build -t star-trek-diplomacy-backend .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e FRONTEND_URL=http://localhost:5173 \
  star-trek-diplomacy-backend
```

**Frontend:**
```bash
cd frontend
docker build -t star-trek-diplomacy-frontend .
docker run -p 80:80 star-trek-diplomacy-frontend
```

---

## Traditional VPS Deployment

### Prerequisites
- Ubuntu 20.04+ server
- Node.js 18+
- Nginx
- PM2
- PostgreSQL (optional)

### Setup

1. **Install Dependencies**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx postgresql
   sudo npm install -g pm2
   ```

2. **Clone Repository**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/star-trek-diplomacy.git
   cd star-trek-diplomacy
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with production values
   pm2 start src/index.js --name star-trek-backend
   pm2 save
   pm2 startup
   ```

4. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with production API URL
   npm run build
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           root /var/www/star-trek-diplomacy/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Enable SSL (Recommended)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Vercel (Frontend Only)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   vercel
   ```

3. **Configure Environment Variables**
   - Add `VITE_API_URL` in Vercel dashboard
   - Point to your backend URL

---

## Heroku

### Backend

1. **Create Heroku App**
   ```bash
   heroku create star-trek-diplomacy-backend
   ```

2. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Configure Environment**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-frontend.herokuapp.com
   ```

4. **Deploy**
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Frontend

1. **Create Static Site**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify/Vercel**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`

---

## Environment Variables Checklist

### Backend (.env)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `FRONTEND_URL=<frontend-url>`
- [ ] `DATABASE_URL=<db-connection-string>` (if using DB)
- [ ] `SESSION_SECRET=<random-secure-string>`

### Frontend (.env)
- [ ] `VITE_API_URL=<backend-url>`

---

## Post-Deployment Checklist

- [ ] Test game creation
- [ ] Test player joining
- [ ] Test order submission
- [ ] Test faction abilities
- [ ] Test alliance system
- [ ] Check error logging
- [ ] Monitor performance
- [ ] Setup backups (if using DB)
- [ ] Configure CORS properly
- [ ] Enable HTTPS
- [ ] Setup monitoring (optional)

---

## Monitoring

### PM2 (VPS)
```bash
pm2 monit
pm2 logs star-trek-backend
```

### Railway
- Use Railway dashboard for logs
- Setup alerts for errors

### Custom Monitoring
- Sentry for error tracking
- DataDog for performance
- New Relic for APM

---

## Troubleshooting

### Backend Won't Start
- Check Node.js version: `node --version` (should be 18+)
- Check environment variables
- Check port availability: `lsof -i :3000`

### Frontend Can't Connect to Backend
- Verify CORS settings
- Check `VITE_API_URL` is correct
- Test API directly: `curl https://your-backend.com/api/lobby/create`

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check firewall rules
- Test connection: `psql $DATABASE_URL`

### Performance Issues
- Enable gzip compression
- Use CDN for static assets
- Implement caching
- Scale horizontally with load balancer
