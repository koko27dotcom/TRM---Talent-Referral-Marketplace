# TRM Platform - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Database Setup](#database-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 20 GB | 50+ GB SSD |
| OS | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |

### Required Software

- Node.js 18.x LTS
- MongoDB 6.x
- Redis 7.x
- Nginx
- Git
- Docker (optional)
- Docker Compose (optional)

### Cloud Services (Production)

- **Cloud Provider**: AWS / DigitalOcean / Linode
- **Domain**: Registered domain with DNS access
- **SSL Certificate**: Let's Encrypt or commercial
- **Email Service**: SendGrid / AWS SES
- **File Storage**: AWS S3 / DigitalOcean Spaces
- **Monitoring**: Datadog / New Relic / Grafana

---

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git vim nginx ufw

# Set timezone to Myanmar
sudo timedatectl set-timezone Asia/Yangon

# Create application user
sudo useradd -m -s /bin/bash trmapp
sudo usermod -aG sudo trmapp
```

### 2. Node.js Installation

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x

# Install PM2 globally
sudo npm install -g pm2
```

### 3. MongoDB Installation

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh --eval "db.version()"
```

### 4. Redis Installation

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set supervised systemd
supervised systemd

# Set memory limit (optional)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Verify
redis-cli ping  # Should return PONG
```

---

## Local Development

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/trm-platform.git
cd trm-platform

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables**:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/saramart-referral

# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Frontend URL
FRONTEND_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Payment Configuration (Myanmar Payment Gateways)
KBZPAY_MERCHANT_ID=your-kbzpay-merchant-id
KBZPAY_API_KEY=your-kbzpay-api-key
WAVEPAY_MERCHANT_ID=your-wavepay-merchant-id
WAVEPAY_API_KEY=your-wavepay-api-key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@trm.com

# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=trm-uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# Moonshot AI (Kimi) Configuration
MOONSHOT_API_KEY=your-moonshot-api-key

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### 3. Start Development Server

```bash
# Start backend server
npm run server:dev

# In another terminal, start frontend
npm run dev

# Or start both concurrently
npm run dev:all
```

### 4. Database Seeding (Optional)

```bash
# Seed sample data
npm run db:seed

# Reset database
npm run db:reset
```

---

## Docker Deployment

### 1. Docker Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: trm-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/saramart-referral
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      - mongo
      - redis
    volumes:
      - ./uploads:/app/uploads
    networks:
      - trm-network

  mongo:
    image: mongo:6
    container_name: trm-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - trm-network

  redis:
    image: redis:7-alpine
    container_name: trm-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - trm-network

  nginx:
    image: nginx:alpine
    container_name: trm-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - trm-network

volumes:
  mongo_data:
  redis_data:

networks:
  trm-network:
    driver: bridge
```

### 3. Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start server
CMD ["node", "server/server.js"]
```

### 4. Deploy with Docker Compose

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down

# Update deployment
docker-compose pull
docker-compose up -d
```

---

## Production Deployment

### 1. Server Setup

```bash
# Create application directory
sudo mkdir -p /var/www/trm
sudo chown -R trmapp:trmapp /var/www/trm

# Clone repository
cd /var/www/trm
git clone https://github.com/your-org/trm-platform.git .

# Install dependencies
npm install --production

# Build frontend
npm run build
```

### 2. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'trm-api',
    script: './server/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Graceful shutdown
    wait_ready: true,
    // Auto-restart on failure
    autorestart: true,
    // Don't restart if crashing too fast
    exp_backoff_restart_delay: 100
  }]
};
```

Start with PM2:

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u trmapp --hp /home/trmapp

# Monitor
pm2 monit

# View logs
pm2 logs trm-api
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/trm`:

```nginx
upstream trm_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name api.trm.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.trm.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.trm.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.trm.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    
    # Client body size
    client_max_body_size 10M;
    
    # Static files
    location /static {
        alias /var/www/trm/dist/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Uploads
    location /uploads {
        alias /var/www/trm/uploads;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://trm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Login route with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://trm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://trm_backend;
    }
    
    # Frontend
    location / {
        root /var/www/trm/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache HTML files for 1 hour
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/trm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.trm.com -d www.trm.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## Kubernetes Deployment

### 1. Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: trm
```

### 2. ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: trm-config
  namespace: trm
data:
  NODE_ENV: "production"
  PORT: "5000"
  LOG_LEVEL: "info"
```

### 3. Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: trm-secrets
  namespace: trm
type: Opaque
stringData:
  MONGODB_URI: "mongodb://mongo:27017/saramart-referral"
  JWT_ACCESS_SECRET: "your-secret"
  JWT_REFRESH_SECRET: "your-refresh-secret"
```

### 4. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trm-app
  namespace: trm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trm-app
  template:
    metadata:
      labels:
        app: trm-app
    spec:
      containers:
      - name: trm-app
        image: your-registry/trm-app:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: trm-config
        - secretRef:
            name: trm-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 5. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: trm-service
  namespace: trm
spec:
  selector:
    app: trm-app
  ports:
  - port: 80
    targetPort: 5000
  type: ClusterIP
```

### 6. Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trm-ingress
  namespace: trm
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.trm.com
    secretName: trm-tls
  rules:
  - host: api.trm.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: trm-service
            port:
              number: 80
```

### 7. HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trm-hpa
  namespace: trm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trm-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Database Setup

### 1. MongoDB Configuration

```bash
# Secure MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application user
use saramart-referral
db.createUser({
  user: "trmapp",
  pwd: "app-password",
  roles: [ { role: "readWrite", db: "saramart-referral" } ]
})

# Enable authentication
sudo nano /etc/mongod.conf

security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### 2. Database Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-mongodb.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="saramart-referral"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Run backup
mongodump --uri="mongodb://trmapp:password@localhost:27017/$DB_NAME" \
  --out="$BACKUP_DIR/$DATE"

# Compress backup
cd $BACKUP_DIR
tar -czf "$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

# Upload to S3 (optional)
aws s3 cp "$DATE.tar.gz" s3://trm-backups/mongodb/

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE.tar.gz"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## Monitoring Setup

### 1. PM2 Monitoring

```bash
# Enable PM2 monitoring
pm2 monitor

# Configure keymetrics (optional)
pm2 link <secret> <public>
```

### 2. Application Metrics

Install monitoring middleware:

```javascript
// server/middleware/monitoring.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

module.exports = { httpRequestDuration, httpRequestsTotal };
```

### 3. Log Aggregation

Using Winston:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

## Backup & Recovery

### 1. Full System Backup

```bash
#!/bin/bash
# /opt/scripts/full-backup.sh

BACKUP_DIR="/backups/full"
DATE=$(date +%Y%m%d)

# Backup application files
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /var/www/trm

# Backup Nginx config
tar -czf "$BACKUP_DIR/nginx_$DATE.tar.gz" /etc/nginx

# Backup environment files
cp /var/www/trm/.env "$BACKUP_DIR/env_$DATE"

# MongoDB backup (already handled separately)

# Upload to S3
aws s3 sync $BACKUP_DIR s3://trm-backups/full/

echo "Full backup completed: $DATE"
```

### 2. Recovery Procedures

#### Application Recovery

```bash
# Restore application files
cd /var/www
tar -xzf /backups/full/app_20260204.tar.gz

# Restore environment
cp /backups/full/env_20260204 /var/www/trm/.env

# Install dependencies
cd /var/www/trm
npm install --production

# Restart
pm2 restart trm-api
```

#### Database Recovery

```bash
# Restore MongoDB
cd /backups/mongodb
tar -xzf 20260204_020000.tar.gz

mongorestore --uri="mongodb://trmapp:password@localhost:27017/saramart-referral" \
  20260204_020000/saramart-referral
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
pm2 logs trm-api

# Check environment variables
cat /var/www/trm/.env

# Verify MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check port availability
sudo netstat -tlnp | grep 5000
```

#### 2. High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart trm-api --max-memory-restart 500M

# Check for memory leaks
node --inspect server/server.js
```

#### 3. Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection
mongosh --uri="mongodb://localhost:27017/saramart-referral"

# Check logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### 4. Nginx Errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check access logs
sudo tail -f /var/log/nginx/access.log
```

### Health Check Commands

```bash
# Application health
curl http://localhost:5000/api/v1/health

# Database health
mongosh --eval "db.adminCommand('ping')"

# Redis health
redis-cli ping

# Disk space
df -h

# Memory usage
free -h

# CPU usage
top
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates valid
- [ ] Backup created

### Deployment

- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Build frontend
- [ ] Restart application
- [ ] Verify health checks
- [ ] Monitor error logs

### Post-Deployment

- [ ] Smoke tests passed
- [ ] API endpoints responding
- [ ] Database connections stable
- [ ] Background jobs running
- [ ] Notifications working

---

*Last Updated: February 2026*

*© 2026 TRM Platform. All rights reserved.*
