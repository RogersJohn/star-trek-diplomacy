FROM node:18-alpine

WORKDIR /app

# Copy workspace root package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies using workspace
RUN npm ci --workspace=backend --workspace=shared --only=production

# Copy source code
COPY backend/ ./backend/
COPY shared/ ./shared/

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "src/index.js"]
