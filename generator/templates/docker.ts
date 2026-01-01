/**
 * Docker Templates - Dockerfile and Docker Compose Generation
 */

import { kebab } from './api';

export function apiDockerfile(): string {
  return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/server.js"]
`;
}

export function frontendDockerfile(): string {
  return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`;
}

export function nginxConfig(): string {
  return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://api:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
}

export function dockerCompose(appName: string): string {
  const dbName = kebab(appName).replace(/-/g, '_');
  
  return `version: '3.8'

services:
  api:
    build:
      context: ./api
      dockerfile: ../docker/Dockerfile.api
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://app:password@postgres:5432/${dbName}
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - api

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

volumes:
  pgdata:
`;
}

export function envExample(appName: string): string {
  const dbName = kebab(appName).replace(/-/g, '_');
  
  return `NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://app:password@localhost:5432/${dbName}
`;
}

export function gitignore(): string {
  return `node_modules/
dist/
.env
*.log
`;
}
