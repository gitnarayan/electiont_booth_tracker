FROM node:18-alpine

WORKDIR /usr/src/app

# Install deps early (only package files) to leverage docker cache
COPY package*.json ./
RUN npm install --legacy-peer-deps --silent

# Copy source
COPY . .

EXPOSE 5000

# Default command for local development
CMD ["npm", "run", "dev"]
