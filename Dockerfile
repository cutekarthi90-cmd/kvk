FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application source
COPY . .

# Build production frontend bundle
RUN npm run build

# Expose port (Render provides process.env.PORT)
ENV PORT=5000
EXPOSE 5000

# Start production server
CMD ["node", "server.js"]
