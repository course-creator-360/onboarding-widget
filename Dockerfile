FROM node:20-alpine

WORKDIR /app

# Install build dependencies (no longer need SQLite dependencies)
RUN apk add --no-cache \
    openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose the port
EXPOSE 4002

# Start the dev server (with Prisma migration)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

