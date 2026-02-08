FROM node:18-alpine AS builder

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

# Install dependencies using workspace
RUN npm ci --workspace=frontend --workspace=shared

# Copy source code
COPY frontend/ ./frontend/
COPY shared/ ./shared/

WORKDIR /app/frontend

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Only substitute BACKEND_URL, leave nginx variables untouched
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL
ENV BACKEND_URL=http://localhost:3000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
