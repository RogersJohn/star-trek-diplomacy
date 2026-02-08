FROM node:18-alpine

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

# Make them available during build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Copy workspace root package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install all dependencies (need devDeps for vite build)
RUN npm ci --workspace=frontend --workspace=shared

# Copy source code
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build the frontend
WORKDIR /app/frontend
RUN npm run build

# Remove node_modules to reduce image size, keep only what server.js needs
RUN rm -rf node_modules ../node_modules ../shared

EXPOSE 3000

CMD ["node", "server.js"]
