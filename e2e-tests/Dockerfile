FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy test files
COPY . .

# Wait for services to be ready
RUN apk add --no-cache curl

# Run tests
CMD ["npm", "test"]
