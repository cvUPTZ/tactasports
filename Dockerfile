# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Final Production Image
FROM python:3.10-slim

# Install system dependencies for OpenCV and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY python/requirements.txt ./python/
RUN pip install --no-cache-dir -r python/requirements.txt

# Install Node dependencies (production only)
COPY package*.json ./
RUN npm install --production

# Copy build artifacts and source code
COPY --from=frontend-builder /app/dist ./dist
COPY . .

# Expose the Node server port
EXPOSE 3001

# Start script
RUN chmod +x scripts/start-render.sh
CMD ["./scripts/start-render.sh"]
