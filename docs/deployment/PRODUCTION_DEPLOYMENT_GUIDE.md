# TRM Referral Platform - Production Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Requirements](#pre-deployment-requirements)
3. [Environment Setup](#environment-setup)
4. [Deployment Options](#deployment-options)
5. [Step-by-Step Deployment](#step-by-step-deployment)
6. [Service Configuration](#service-configuration)
7. [Third-Party Integrations](#third-party-integrations)
8. [Post-Deployment](#post-deployment)
9. [Maintenance & Operations](#maintenance--operations)
10. [Troubleshooting](#troubleshooting)
11. [Checklists](#checklists)

---

## Overview

This guide provides comprehensive instructions for deploying the TRM (Talent Referral Marketplace) Referral Platform to production environments. The platform is built with:

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js 18+, Express.js
- **Database**: MongoDB 6.0+
- **Cache**: Redis 7.0+
- **Queue**: Bull (Redis-based)
- **Container**: Docker
- **Orchestration**: Kubernetes (optional)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Web App    │  │  Mobile App  │  │   Admin Dashboard        │  │
│  │   (React)    │  │(React Native)│  │      (React)             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────────┘
          │                 │                     │
          └─────────────────┼─────────────────────┘
                            │ HTTPS/HTTP2
┌───────────────────────────▼─────────────────────────────────────────┐
│                      API GATEWAY LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Nginx / Load Balancer                      │  │
│  │  - SSL Termination  - Rate Limiting  - Request Routing       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                     APPLICATION LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Express.js API Server (Node.js)                  │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │  │
│  │  │   Routes    │ │ Middleware  │ │  Controllers            │ │  │
│  │  │  (/api/v1)  │ │  (Auth,     │ │  (Business Logic)       │ │  │
│  │  │             │ │  Validation)│ │                         │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  DATA LAYER   │  │  SERVICE LAYER  │  │  JOB QUEUE  │
│  ┌────────┐   │  │  ┌───────────┐  │  │  ┌──────┐  │
│  │MongoDB │   │  │  │  AI Svc   │  │  │  │ Bull │  │
│  │        │   │  │  │ Payment   │  │  │  │Redis │  │
│  └────────┘   │  │  │ Notification│  │  │  └──────┘  │
│  ┌────────┐   │  │  │ Analytics │  │  │             │
│  │ Redis  │   │  │  └───────────┘  │  │             │
│  │(Cache) │   │  │                 │  │             │
│  └────────┘   │  │                 │  │             │
└───────────────┘  └─────────────────┘  └─────────────┘
```

---

## Pre-Deployment Requirements

### System Requirements

#### Minimum Production Specifications

| Component | Specification | Notes |
|-----------|--------------|-------|
| **CPU** | 4+ cores | 8+ cores recommended for high traffic |
| **RAM** | 8 GB | 16 GB recommended for production |
| **Disk** | 100 GB SSD | 500 GB+ for database growth |
| **OS** | Ubuntu 22.04 LTS | Or compatible Linux distribution |
| **Network** | 1 Gbps | Low latency to Myanmar region |

#### Recommended Production Specifications (High Availability)

| Component | Specification | Notes |
|-----------|--------------|-------|
| **CPU** | 8+ cores | Per application node |
| **RAM** | 32 GB | Per application node |
| **Disk** | 1 TB NVMe SSD | For database nodes |
| **Nodes** | 3+ | For high availability |
| **Load Balancer** | Hardware or Cloud LB | SSL termination support |

### Required Services

#### Node.js Runtime

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher
```

#### MongoDB 6.0+

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Redis 7.0+

```bash
# Install Redis
sudo apt-get update
sudo apt-get install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-secure-redis-password

# Enable persistence
appendonly yes
appendfsync everysec

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### Nginx

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Docker (Optional)

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
```

### Domain and SSL Certificate Requirements

#### Domain Requirements

1. **Primary Domain**: `myanjobs.com` (example)
2. **API Subdomain**: `api.myanjobs.com`
3. **Admin Subdomain**: `admin.myanjobs.com`
4. **CDN Subdomain**: `cdn.myanjobs.com` (optional)

#### SSL Certificate Options

**Option 1: Let's Encrypt (Free)**

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d myanjobs.com -d www.myanjobs.com -d api.myanjobs.com -d admin.myanjobs.com

# Auto-renewal test
sudo certbot renew --dry-run
```

**Option 2: Commercial Certificate**

Upload certificate files to:
- Certificate: `/etc/ssl/certs/myanjobs.crt`
- Private Key: `/etc/ssl/private/myanjobs.key`
- CA Bundle: `/etc/ssl/certs/ca-bundle.crt`

### Third-Party Service Accounts

#### Required Accounts

| Service | Purpose | Setup URL |
|---------|---------|-----------|
| **SendGrid** | Email delivery | https://sendgrid.com |
| **Twilio** | SMS notifications | https://twilio.com |
| **AWS** | S3 storage, SES | https://aws.amazon.com |
| **MongoDB Atlas** | Managed MongoDB (optional) | https://mongodb.com/atlas |
| **Redis Cloud** | Managed Redis (optional) | https://redis.com/cloud |
| **Sentry** | Error tracking | https://sentry.io |
| **Datadog** | Monitoring (optional) | https://datadoghq.com |

#### Myanmar Payment Gateways

| Provider | Purpose | Contact |
|----------|---------|---------|
| **KBZPay** | Mobile wallet payments | KBZ Bank |
| **WavePay** | Mobile wallet payments | Wave Money |
| **AYA Pay** | Banking payments | AYA Bank |
| **MMQR** | QR code payments | Myanmar Payment Union |

#### Messaging Services

| Service | Purpose | Setup |
|---------|---------|-------|
| **Viber Bot** | Bot notifications | https://partners.viber.com |
| **Telegram Bot** | Bot notifications | @BotFather |
| **WhatsApp Business** | Business messaging | Meta Business |

### Security Prerequisites

#### Firewall Configuration

```bash
# Install UFW
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (if not behind reverse proxy)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

#### Fail2Ban Installation

```bash
# Install Fail2Ban
sudo apt-get install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure for SSH
sudo tee /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## Environment Setup

### Production Environment Configuration

#### Directory Structure

```
/opt/trm/
├── app/                    # Application code
├── config/                 # Configuration files
├── logs/                   # Application logs
├── backups/                # Database backups
├── scripts/                # Deployment scripts
├── ssl/                    # SSL certificates
└── uploads/                # File uploads
```

#### Create Directory Structure

```bash
# Create directories
sudo mkdir -p /opt/trm/{app,config,logs,backups,scripts,ssl,uploads}

# Set ownership
sudo chown -R $USER:$USER /opt/trm

# Set permissions
chmod 755 /opt/trm
chmod 750 /opt/trm/config
chmod 750 /opt/trm/ssl
chmod 755 /opt/trm/uploads
```

### Environment Variables Documentation

#### Core Application Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Application port | Yes | `3000` |
| `HOST` | Bind address | Yes | `0.0.0.0` |
| `API_URL` | Public API URL | Yes | `https://api.myanjobs.com` |
| `FRONTEND_URL` | Frontend URL | Yes | `https://myanjobs.com` |

#### Database Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://...` |
| `MONGODB_POOL_SIZE` | Connection pool size | No | `20` |
| `MONGODB_MAX_IDLE_TIME_MS` | Max idle time | No | `60000` |

#### Redis Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REDIS_URL` | Redis connection URL | Yes | `redis://...` |
| `REDIS_PASSWORD` | Redis password | Yes | `secure-password` |
| `REDIS_CLUSTER_ENABLED` | Enable cluster mode | No | `true` |

#### JWT Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `JWT_SECRET` | JWT signing secret | Yes | `min-32-char-secret` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | `min-32-char-secret` |
| `JWT_EXPIRES_IN` | Access token expiry | No | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | No | `7d` |

#### Security Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ENCRYPTION_KEY` | Data encryption key | Yes | `32-char-key` |
| `CORS_ORIGIN` | Allowed origins | Yes | `https://myanjobs.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | No | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests | No | `100` |

### Secrets Management

#### Option 1: Environment File (Basic)

```bash
# Create production environment file
sudo nano /opt/trm/config/.env.production

# Set restrictive permissions
sudo chmod 600 /opt/trm/config/.env.production
sudo chown root:root /opt/trm/config/.env.production
```

#### Option 2: AWS Secrets Manager

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Configure AWS credentials
aws configure

# Create secret
aws secretsmanager create-secret \
  --name trm/production/env \
  --secret-string file:///opt/trm/config/.env.production

# Retrieve secret in application
aws secretsmanager get-secret-value \
  --secret-id trm/production/env \
  --query SecretString \
  --output text
```

#### Option 3: HashiCorp Vault

```bash
# Install Vault
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install -y vault

# Store secrets
vault kv put secret/trm/production \
  jwt_secret="your-secret" \
  mongodb_uri="mongodb://..."

# Retrieve secrets
vault kv get -format=json secret/trm/production
```

### Database Configuration

#### MongoDB Production Configuration

```yaml
# /etc/mongod.conf (Production Settings)
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
      journalCompressor: zlib
    collectionConfig:
      blockCompressor: zlib

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1  # Change to 0.0.0.0 only if necessary with auth

security:
  authorization: enabled

replication:
  replSetName: trm-rs  # Enable for replica set

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```

#### MongoDB User Creation

```javascript
// Connect to MongoDB
mongosh -u admin -p --authenticationDatabase admin

// Create application user
use trm_production
db.createUser({
  user: "trm_app",
  pwd: "secure-password",
  roles: [
    { role: "readWrite", db: "trm_production" },
    { role: "dbAdmin", db: "trm_production" }
  ]
})

// Create backup user
use admin
db.createUser({
  user: "trm_backup",
  pwd: "backup-password",
  roles: [
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ]
})
```

### Redis Configuration

#### Redis Production Configuration

```bash
# /etc/redis/redis.conf (Production Settings)

# Network
bind 127.0.0.1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Security
requirepass your-secure-redis-password

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes

# AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### SSL/TLS Setup

#### Nginx SSL Configuration

```nginx
# /etc/nginx/sites-available/myanjobs.com

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name myanjobs.com www.myanjobs.com;

    # SSL Certificates
    ssl_certificate /etc/ssl/certs/myanjobs.crt;
    ssl_certificate_key /etc/ssl/private/myanjobs.key;
    ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root and index
    root /opt/trm/app/dist;
    index index.html;

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Frontend fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name myanjobs.com www.myanjobs.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Deployment Options

### 1. Docker Deployment (Single Container)

#### Build and Run

```bash
# Build production image
docker build -t trm-app:latest -f docker/Dockerfile .

# Run container
docker run -d \
  --name trm-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/trm/uploads:/app/uploads \
  -v /opt/trm/config/.env.production:/app/.env:ro \
  -e NODE_ENV=production \
  trm-app:latest

# View logs
docker logs -f trm-app

# Health check
curl http://localhost:3000/api/health
```

### 2. Docker Compose Deployment (Multi-Container)

#### Using Existing docker-compose.yml

```bash
# Navigate to docker directory
cd docker

# Create environment file
cp ../.env.example .env
nano .env  # Edit with production values

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale trm-app=3

# Stop services
docker-compose down

# Stop and remove volumes (Caution!)
docker-compose down -v
```

#### Docker Compose Production Overrides

```yaml
# docker/docker-compose.prod.yml
version: '3.8'

services:
  trm-app:
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

  mongodb:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

  redis:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  nginx:
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/trm/ssl:/etc/nginx/ssl:ro
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
```

### 3. Kubernetes Deployment

#### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s/release/$(curl -L -s https://dl.k8s/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl apply -f k8s/secret.yaml

# Create configmaps
kubectl apply -f k8s/configmap.yaml

# Deploy MongoDB
kubectl apply -f k8s/mongodb-deployment.yaml

# Deploy Redis
kubectl apply -f k8s/redis-deployment.yaml

# Deploy application
kubectl apply -f k8s/app-deployment.yaml

# Create services
kubectl apply -f k8s/service.yaml

# Create ingress
kubectl apply -f k8s/ingress.yaml

# Enable autoscaling
kubectl apply -f k8s/hpa.yaml

# Deploy monitoring
kubectl apply -f k8s/monitoring.yaml
```

#### Verify Kubernetes Deployment

```bash
# Check pods
kubectl get pods -n trm

# Check services
kubectl get svc -n trm

# Check ingress
kubectl get ingress -n trm

# View logs
kubectl logs -f deployment/trm-app -n trm

# Port forward for testing
kubectl port-forward svc/trm-app 3000:3000 -n trm
```

### 4. Cloud Provider Deployment

#### AWS Deployment

**Using Elastic Beanstalk:**

```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init -p node.js trm-platform

# Create environment
eb create trm-production \
  --single \
  --envvars "NODE_ENV=production,MONGODB_URI=mongodb://..."

# Deploy
eb deploy

# Open application
eb open
```

**Using ECS (Elastic Container Service):**

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name trm-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster trm-cluster \
  --service-name trm-app \
  --task-definition trm-app \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

#### GCP Deployment

**Using Cloud Run:**

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/trm-app

# Deploy to Cloud Run
gcloud run deploy trm-app \
  --image gcr.io/PROJECT_ID/trm-app \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 100 \
  --max-instances 10
```

#### Azure Deployment

**Using Container Instances:**

```bash
# Create resource group
az group create --name trm-rg --location southeastasia

# Create container
az container create \
  --resource-group trm-rg \
  --name trm-app \
  --image trmregistry.azurecr.io/trm-app:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 \
  --environment-variables "NODE_ENV=production"
```

### 5. VPS/Bare Metal Deployment

#### Manual Deployment

```bash
# 1. Clone repository
cd /opt/trm/app
git clone https://github.com/your-org/trm-platform.git .

# 2. Install dependencies
npm ci --production

# 3. Build frontend
npm run build

# 4. Copy environment file
cp /opt/trm/config/.env.production .env

# 5. Start with PM2
pm2 start server/server.js --name trm-app \
  --instances max \
  --env production \
  --log /opt/trm/logs/app.log \
  --error /opt/trm/logs/error.log \
  --merge-logs

# 6. Save PM2 config
pm2 save
pm2 startup systemd
```

### 6. Platform-as-a-Service Deployment

#### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Add environment variables
railway variables set NODE_ENV=production
railway variables set MONGODB_URI="mongodb://..."

# Add custom domain
railway domain add myanjobs.com
```

#### Render Deployment

```bash
# Create render.yaml
# See render.yaml in repository root

# Deploy via Git integration
# Connect GitHub repository to Render
# Auto-deploy on push to main branch
```

#### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create trm-platform

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-secret"

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=2
```

---

## Step-by-Step Deployment

### Infrastructure Provisioning

#### 1. Server Setup

```bash
#!/bin/bash
# scripts/setup-server.sh

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essential packages
sudo apt-get install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  nginx \
  ufw \
  fail2ban \
  certbot \
  python3-certbot-nginx

# Configure timezone
sudo timedatectl set-timezone Asia/Rangoon

# Create application user
sudo useradd -r -s /bin/false trm-app

# Create directory structure
sudo mkdir -p /opt/trm/{app,config,logs,backups,uploads}
sudo chown -R trm-app:trm-app /opt/trm
```

#### 2. Database Setup

```bash
#!/bin/bash
# scripts/setup-database.sh

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongosh <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "$(openssl rand -base64 32)",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
EOF

# Install Redis
sudo apt-get install -y redis-server

# Configure Redis
sudo tee /etc/redis/redis.conf <<EOF
requirepass $(openssl rand -base64 32)
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
EOF

sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Application Deployment

#### 1. Build Application

```bash
#!/bin/bash
# scripts/build-app.sh

cd /opt/trm/app

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Run tests
npm run test:ci

# Build frontend
npm run build

# Run database migrations (if any)
npm run db:migrate

# Create indexes
npm run db:indexes:create
```

#### 2. Deploy Application

```bash
#!/bin/bash
# scripts/deploy-app.sh

# Stop existing application
pm2 stop trm-app || true

# Copy new build
cp -r /opt/trm/app/dist /opt/trm/app/dist-new
mv /opt/trm/app/dist /opt/trm/app/dist-old
mv /opt/trm/app/dist-new /opt/trm/app/dist

# Start application
pm2 start /opt/trm/app/server/server.js \
  --name trm-app \
  --instances max \
  --env production \
  --log /opt/trm/logs/app.log

# Verify deployment
sleep 5
curl -f http://localhost:3000/api/health || exit 1

# Remove old build
rm -rf /opt/trm/app/dist-old

echo "Deployment successful!"
```

### Static Assets Deployment (CDN)

#### AWS S3 + CloudFront

```bash
#!/bin/bash
# scripts/deploy-assets.sh

# Build with CDN prefix
VITE_ASSET_URL=https://cdn.myanjobs.com npm run build

# Sync to S3
aws s3 sync dist/assets s3://myanjobs-cdn/assets \
  --cache-control "public, max-age=31536000, immutable"

# Sync index.html with no-cache
aws s3 cp dist/index.html s3://myanjobs-cdn/ \
  --cache-control "no-cache"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXXXXXX \
  --paths "/*"
```

### Mobile App Build and Deployment

#### Build React Native App

```bash
#!/bin/bash
# scripts/build-mobile.sh

cd mobile

# Install dependencies
npm install

# Build for Android
cd android
./gradlew assembleRelease

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore myanjobs.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  myanjobs

# Align APK
zipalign -v 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  app/build/outputs/apk/release/myanjobs.apk

# Upload to Play Store
# (Use Google Play Console or fastlane)
```

### DNS Configuration

#### Cloudflare DNS Example

```
Type    Name            Value                           TTL
A       @               192.0.2.1                       Auto
A       www             192.0.2.1                       Auto
A       api             192.0.2.1                       Auto
A       admin           192.0.2.1                       Auto
CNAME   cdn             cdn.myanjobs.com.edgekey.net    Auto
TXT     @               "v=spf1 include:sendgrid.net ~all" Auto
```

### Load Balancer Setup

#### Nginx Load Balancer

```nginx
upstream trm_backend {
    least_conn;
    
    server 10.0.1.10:3000 weight=5;
    server 10.0.1.11:3000 weight=5;
    server 10.0.1.12:3000 backup;
    
    keepalive 32;
}

server {
    listen 80;
    server_name api.myanjobs.com;
    
    location / {
        proxy_pass http://trm_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        health_check interval=5s fails=3 passes=2;
    }
}
```

---

## Service Configuration

### MongoDB Replica Set Setup

#### Initialize Replica Set

```javascript
// Connect to primary node
mongosh --host mongodb-0.mongodb:27017

// Initialize replica set
rs.initiate({
  _id: "trm-rs",
  members: [
    { _id: 0, host: "mongodb-0.mongodb:27017", priority: 2 },
    { _id: 1, host: "mongodb-1.mongodb:27017", priority: 1 },
    { _id: 2, host: "mongodb-2.mongodb:27017", priority: 1, arbiterOnly: false }
  ]
});

// Check status
rs.status();

// Create application user
use admin
db.createUser({
  user: "trm_app",
  pwd: "secure-password",
  roles: [
    { role: "readWrite", db: "trm_production" },
    { role: "dbAdmin", db: "trm_production" }
  ]
});
```

#### Connection String

```
mongodb://trm_app:password@mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/trm_production?replicaSet=trm-rs&authSource=admin&w=majority&readPreference=primaryPreferred
```

### Redis Cluster Setup

#### Create Redis Cluster

```bash
# Start Redis nodes
redis-server --port 7000 --cluster-enabled yes --cluster-config-file nodes-7000.conf --cluster-node-timeout 5000 --appendonly yes --daemonize yes
redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes-7001.conf --cluster-node-timeout 5000 --appendonly yes --daemonize yes
redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes-7002.conf --cluster-node-timeout 5000 --appendonly yes --daemonize yes

# Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 \
  127.0.0.1:7001 \
  127.0.0.1:7002 \
  --cluster-replicas 0 \
  --cluster-yes

# Verify cluster
redis-cli -p 7000 cluster info
redis-cli -p 7000 cluster nodes
```

### Nginx Configuration

#### Production Nginx Config

```nginx
# /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # MIME
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    
    # Include sites
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### PM2 Process Management

#### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'trm-app',
    script: './server/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/opt/trm/logs/app.log',
    error_file: '/opt/trm/logs/error.log',
    out_file: '/opt/trm/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 5,
    restart_delay: 3000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    source_map_support: true,
    // Health monitoring
    health_check_grace_period: 30000,
    // Auto-restart on failure
    autorestart: true,
    // Don't restart if crashing too fast
    exp_backoff_restart_delay: 100,
    // Environment variables from file
    env_file: '/opt/trm/config/.env.production'
  }]
};
```

#### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Restart application
pm2 restart trm-app

# Reload (zero-downtime)
pm2 reload trm-app

# View logs
pm2 logs trm-app

# Monitor
pm2 monit

# Save configuration
pm2 save

# Setup startup script
pm2 startup systemd
```

### Log Aggregation Setup

#### Using ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

#### Filebeat Configuration

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /opt/trm/logs/*.log
  fields:
    service: trm-app
    environment: production
  fields_under_root: true

output.logstash:
  hosts: ["localhost:5044"]

logging.level: info
```

### Monitoring Setup (Prometheus, Grafana)

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'trm-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['localhost:9216']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "TRM Platform Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### Alerting Configuration

#### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@myanjobs.com'
  smtp_auth_username: 'alerts@myanjobs.com'
  smtp_auth_password: 'app-password'

route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'email'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@myanjobs.com'

  - name: 'email'
    email_configs:
      - to: 'team@myanjobs.com'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-pagerduty-key'
```

---

## Third-Party Integrations

### Viber Bot Setup

#### Create Viber Bot

1. Go to https://partners.viber.com
2. Create a new bot account
3. Get authentication token
4. Set webhook URL: `https://api.myanjobs.com/api/webhooks/viber`

#### Configuration

```bash
# Environment variables
VIBER_AUTH_TOKEN=your-viber-auth-token
VIBER_WEBHOOK_URL=https://api.myanjobs.com/api/webhooks/viber
```

#### Webhook Setup

```javascript
// server/services/viberService.js
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;

const bot = new ViberBot({
  authToken: process.env.VIBER_AUTH_TOKEN,
  name: "MyanJobs Bot",
  avatar: "https://myanjobs.com/bot-avatar.png"
});

// Set webhook
bot.setWebhook(process.env.VIBER_WEBHOOK_URL)
  .then(() => console.log('Viber webhook set'))
  .catch(err => console.error('Viber webhook error:', err));
```

### Telegram Bot Setup

#### Create Telegram Bot

1. Message @BotFather on Telegram
2. Create new bot with `/newbot`
3. Get bot token
4. Set webhook URL

#### Configuration

```bash
# Environment variables
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://api.myanjobs.com/api/webhooks/telegram
```

#### Webhook Setup

```bash
# Set webhook via curl
curl -X POST \
  https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://api.myanjobs.com/api/webhooks/telegram",
    "secret_token": "your-webhook-secret"
  }'
```

### Payment Gateway Configuration

#### KBZPay Setup

```bash
# Environment variables
KBZPAY_MERCHANT_ID=your-kbz-merchant-id
KBZPAY_API_KEY=your-kbz-api-key
KBZPAY_API_SECRET=your-kbz-api-secret
KBZPAY_WEBHOOK_SECRET=your-kbz-webhook-secret
KBZPAY_API_URL=https://api.kbzpay.com/payment/gateway
KBZPAY_CALLBACK_URL=https://api.myanjobs.com/api/payments/callback/kbz_pay
```

#### WavePay Setup

```bash
# Environment variables
WAVEPAY_MERCHANT_ID=your-wave-merchant-id
WAVEPAY_API_KEY=your-wave-api-key
WAVEPAY_API_SECRET=your-wave-api-secret
WAVEPAY_WEBHOOK_SECRET=your-wave-webhook-secret
WAVEPAY_API_URL=https://payments.wavemoney.io
WAVEPAY_CALLBACK_URL=https://api.myanjobs.com/api/payments/callback/wave_pay
```

#### AYA Pay Setup

```bash
# Environment variables
AYAPAY_MERCHANT_ID=your-aya-merchant-id
AYAPAY_API_KEY=your-aya-api-key
AYAPAY_API_SECRET=your-aya-api-secret
AYAPAY_WEBHOOK_SECRET=your-aya-webhook-secret
AYAPAY_API_URL=https://api.ayapay.com/v1
AYAPAY_CALLBACK_URL=https://api.myanjobs.com/api/payments/callback/aya_pay
```

### Email Service Configuration (SendGrid)

#### SendGrid Setup

```bash
# Environment variables
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@myanjobs.com
EMAIL_FROM_NAME=MyanJobs
```

#### Domain Authentication

1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Authenticate your domain
3. Add DNS records as instructed
4. Verify domain authentication

### SMS Service Configuration

#### Twilio Setup

```bash
# Environment variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Cloud Storage Configuration (AWS S3)

#### S3 Bucket Setup

```bash
# Create bucket
aws s3 mb s3://myanjobs-production-uploads --region ap-southeast-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket myanjobs-production-uploads \
  --versioning-configuration Status=Enabled

# Set CORS
aws s3api put-bucket-cors \
  --bucket myanjobs-production-uploads \
  --cors-configuration file://cors.json
```

#### CORS Configuration

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://myanjobs.com", "https://admin.myanjobs.com"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

#### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::myanjobs-production-uploads/*"
    }
  ]
}
```

---

## Post-Deployment

### Database Seeding

#### Run Seeders

```bash
# Seed all data
npm run seed

# Seed specific data
npm run seed:users
npm run seed:jobs
npm run seed:market
npm run seed:academy

# Clear existing data
npm run seed:clear
```

#### Custom Seeding Script

```bash
#!/bin/bash
# scripts/seed-production.sh

cd /opt/trm/app

# Create admin user
node -e "
const mongoose = require('mongoose');
const User = require('./server/models/User');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admin = new User({
    email: 'admin@myanjobs.com',
    password: await bcrypt.hash('ChangeMe123!', 10),
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isVerified: true,
    status: 'active'
  });
  
  await admin.save();
  console.log('Admin user created');
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

### Admin User Creation

```bash
# Create admin via API
curl -X POST https://api.myanjobs.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myanjobs.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Promote to admin (via database)
mongosh $MONGODB_URI --eval "
  db.users.updateOne(
    { email: 'admin@myanjobs.com' },
    { \$set: { role: 'admin', isVerified: true } }
  )
"
```

### Health Check Verification

#### Run Verification Script

```bash
# Run deployment verification
./scripts/deploy-verify.sh

# Expected output:
# ==========================================
# TRM Referral Platform - Deployment Verification
# ==========================================
# 
# --- 1. Basic Health Checks ---
# [INFO] ✓ Basic health endpoint (HTTP 200)
# [INFO] ✓ Health status (healthy)
# 
# --- 2. Readiness Checks ---
# [INFO] ✓ Readiness endpoint (HTTP 200)
# [INFO] ✓ Database connection (true)
# [INFO] ✓ Redis connection (true)
# [INFO] ✓ Memory status (true)
```

#### Manual Health Checks

```bash
# Basic health
curl https://api.myanjobs.com/api/health

# Readiness check
curl https://api.myanjobs.com/api/health/ready

# Deep health check
curl https://api.myanjobs.com/api/health/deep

# Database health
curl https://api.myanjobs.com/api/health/database

# External services health
curl https://api.myanjobs.com/api/health/external
```

### Smoke Testing

#### API Smoke Tests

```bash
#!/bin/bash
# scripts/smoke-tests.sh

API_URL="https://api.myanjobs.com"

# Test authentication
echo "Testing authentication..."
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test public endpoints
echo "Testing public endpoints..."
curl "$API_URL/api/jobs" -w "\nHTTP Status: %{http_code}\n"
curl "$API_URL/api/companies" -w "\nHTTP Status: %{http_code}\n"

# Test health endpoints
echo "Testing health endpoints..."
curl "$API_URL/api/health" -w "\nHTTP Status: %{http_code}\n"
```

### Performance Validation

#### Load Testing with k6

```javascript
// tests/load/k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.myanjobs.com/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

#### Run Load Test

```bash
# Install k6
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Run test
k6 run tests/load/k6-load-test.js
```

### Security Verification

#### Security Scan

```bash
# Run security audit
npm run security:audit

# Check for vulnerabilities
npm audit --production

# SSL/TLS check
nmap --script ssl-enum-ciphers -p 443 myanjobs.com

# Security headers check
curl -I https://myanjobs.com | grep -i "strict-transport\|x-frame\|x-content\|content-security"
```

#### Penetration Testing Checklist

- [ ] SQL injection tests
- [ ] XSS vulnerability tests
- [ ] CSRF protection tests
- [ ] Authentication bypass tests
- [ ] Authorization tests
- [ ] File upload security tests
- [ ] API rate limiting tests
- [ ] Session management tests

### Backup Configuration

#### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/trm/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# MongoDB backup
echo "Backing up MongoDB..."
mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR/mongodb_$DATE" \
  --gzip

# Redis backup
echo "Backing up Redis..."
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Application files
echo "Backing up application files..."
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /opt/trm/app/dist /opt/trm/uploads

# Upload to S3
echo "Uploading to S3..."
aws s3 sync "$BACKUP_DIR" s3://myanjobs-backups/production/ \
  --exclude "*" --include "mongodb_$DATE*" --include "redis_$DATE*" --include "app_$DATE*"

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
aws s3 ls s3://myanjobs-backups/production/ | \
  awk '{print $4}' | \
  while read file; do
    aws s3 rm "s3://myanjobs-backups/production/$file"
  done

echo "Backup completed: $DATE"
```

#### Cron Job for Backups

```bash
# Add to crontab
0 2 * * * /opt/trm/scripts/backup.sh >> /opt/trm/logs/backup.log 2>&1
```

---

## Maintenance & Operations

### Update/Upgrade Procedures

#### Application Update

```bash
#!/bin/bash
# scripts/update-app.sh

set -e

echo "Starting application update..."

# 1. Backup current version
cd /opt/trm/app
git rev-parse HEAD > /opt/trm/backups/previous-version.txt

# 2. Pull latest code
git fetch origin
git checkout main
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run tests
npm run test:ci

# 5. Build application
npm run build

# 6. Run migrations
npm run db:migrate

# 7. Graceful restart
pm2 reload trm-app

# 8. Verify deployment
sleep 5
curl -f http://localhost:3000/api/health || {
  echo "Health check failed, rolling back..."
  # Rollback logic here
  exit 1
}

echo "Update completed successfully!"
```

#### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Update to latest major versions
npx npm-check-updates -u
npm install

# Test after updates
npm run test:ci
```

### Rollback Procedures

#### Application Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_VERSION=$(cat /opt/trm/backups/previous-version.txt)

echo "Rolling back to version: $PREVIOUS_VERSION"

cd /opt/trm/app

# Checkout previous version
git checkout $PREVIOUS_VERSION

# Reinstall dependencies
npm ci

# Rebuild
npm run build

# Restart application
pm2 restart trm-app

# Verify rollback
curl -f http://localhost:3000/api/health

echo "Rollback completed!"
```

#### Database Rollback

```bash
#!/bin/bash
# scripts/rollback-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Restoring database from: $BACKUP_FILE"

# Restore MongoDB
mongorestore \
  --uri="$MONGODB_URI" \
  --gzip \
  --drop \
  "$BACKUP_FILE"

echo "Database restored!"
```

### Backup and Restore Procedures

#### Restore from Backup

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date (YYYYMMDD_HHMMSS)>"
  exit 1
fi

echo "Restoring from backup: $BACKUP_DATE"

# Download from S3
aws s3 cp "s3://myanjobs-backups/production/mongodb_$BACKUP_DATE.gz" /tmp/

# Restore MongoDB
mongorestore \
  --uri="$MONGODB_URI" \
  --gzip \
  --archive=/tmp/mongodb_$BACKUP_DATE.gz

# Restore Redis
cp "/opt/trm/backups/redis_$BACKUP_DATE.rdb" /var/lib/redis/dump.rdb
sudo systemctl restart redis-server

echo "Restore completed!"
```

### Log Rotation

#### Logrotate Configuration

```bash
# /etc/logrotate.d/trm-app
/opt/trm/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 trm-app trm-app
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Certificate Renewal

#### Auto-Renewal with Certbot

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

### Database Maintenance

#### MongoDB Maintenance

```bash
#!/bin/bash
# scripts/mongodb-maintenance.sh

# Compact database
mongosh $MONGODB_URI --eval "db.compactCollection()"

# Rebuild indexes
mongosh $MONGODB_URI --eval "db.reIndex()"

# Analyze query performance
mongosh $MONGODB_URI --eval "db.currentOp({\"secs_running\": {\$gt: 10}})"

# Clear old logs
mongosh $MONGODB_URI --eval "db.getSiblingDB('admin').system.profile.drop()"
```

### Scaling Procedures

#### Horizontal Scaling

```bash
# Add new application server

# 1. Provision new server
# 2. Run setup scripts
# 3. Deploy application
# 4. Add to load balancer

# Update Nginx upstream
sudo nano /etc/nginx/sites-available/myanjobs.com

upstream trm_backend {
    least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;  # New server
}

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

#### Vertical Scaling

```bash
# Scale PM2 instances
pm2 scale trm-app +2  # Add 2 more instances
pm2 scale trm-app 4   # Set to 4 instances total

# Update PM2 config
pm2 save
```

---

## Troubleshooting

### Common Deployment Issues

#### 1. Application Won't Start

**Symptoms:**
- PM2 shows "errored" status
- Port already in use
- Missing environment variables

**Solutions:**

```bash
# Check logs
pm2 logs trm-app

# Check port usage
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:3000)

# Verify environment variables
cat /opt/trm/config/.env.production
pm2 show trm-app
```

#### 2. Database Connection Issues

**Symptoms:**
- "MongoNetworkError" in logs
- Connection timeouts
- Authentication failures

**Solutions:**

```bash
# Test MongoDB connection
mongosh $MONGODB_URI --eval "db.adminCommand('ping')"

# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Verify credentials
mongosh -u trm_app -p --authenticationDatabase trm_production

# Check network connectivity
telnet localhost 27017
nc -zv localhost 27017
```

#### 3. Redis Connection Issues

**Symptoms:**
- "ECONNREFUSED" errors
- Cache not working
- Session issues

**Solutions:**

```bash
# Test Redis connection
redis-cli ping

# Check Redis status
sudo systemctl status redis-server

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Verify authentication
redis-cli -a your-password ping

# Check memory usage
redis-cli info memory
```

#### 4. Nginx 502 Bad Gateway

**Symptoms:**
- 502 errors in browser
- "connect() failed" in Nginx logs

**Solutions:**

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify application is running
curl http://localhost:3000/api/health

# Check Nginx configuration
sudo nginx -t

# Restart services
sudo systemctl restart nginx
pm2 restart trm-app

# Check upstream configuration
grep -A 5 "upstream trm_backend" /etc/nginx/sites-enabled/*
```

#### 5. SSL Certificate Issues

**Symptoms:**
- Browser shows certificate warning
- HTTPS not working
- Certificate expired

**Solutions:**

```bash
# Check certificate expiry
echo | openssl s_client -servername myanjobs.com -connect myanjobs.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate files
ls -la /etc/letsencrypt/live/myanjobs.com/

# Test SSL configuration
openssl s_client -connect myanjobs.com:443 -servername myanjobs.com

# Verify Nginx SSL config
sudo nginx -t
```

### Debugging Commands

#### System Diagnostics

```bash
# Check system resources
htop
df -h
free -m

# Check network connections
sudo netstat -tlnp
sudo ss -tlnp

# Check disk I/O
iostat -x 1

# Check open files
lsof | wc -l
cat /proc/sys/fs/file-max
```

#### Application Diagnostics

```bash
# PM2 status
pm2 status
pm2 show trm-app
pm2 logs trm-app --lines 100

# Node.js debugging
node --inspect server/server.js

# Memory profiling
node --inspect --heapsnapshot-near-heap-limit=3 server/server.js

# CPU profiling
node --prof server/server.js
node --prof-process isolate-0x*.log > profile.txt
```

#### Database Diagnostics

```bash
# MongoDB current operations
mongosh $MONGODB_URI --eval "db.currentOp()"

# MongoDB slow queries
mongosh $MONGODB_URI --eval "db.system.profile.find().sort({ts:-1}).limit(10)"

# MongoDB stats
mongosh $MONGODB_URI --eval "db.stats()"

# Redis slow log
redis-cli slowlog get 10

# Redis memory stats
redis-cli --bigkeys
redis-cli info keyspace
```

### Emergency Procedures

#### Complete Outage Recovery

```bash
#!/bin/bash
# scripts/emergency-recovery.sh

echo "Starting emergency recovery..."

# 1. Check system status
sudo systemctl status nginx
sudo systemctl status mongod
sudo systemctl status redis-server
pm2 status

# 2. Restart services in order
echo "Restarting Redis..."
sudo systemctl restart redis-server

echo "Restarting MongoDB..."
sudo systemctl restart mongod

echo "Waiting for databases..."
sleep 10

echo "Restarting application..."
pm2 restart all

echo "Restarting Nginx..."
sudo systemctl restart nginx

# 3. Verify recovery
echo "Verifying services..."
curl -f http://localhost:3000/api/health && echo "Application OK"
redis-cli ping && echo "Redis OK"
mongosh $MONGODB_URI --eval "db.adminCommand('ping')" && echo "MongoDB OK"

echo "Emergency recovery completed!"
```

#### Database Corruption Recovery

```bash
#!/bin/bash
# scripts/db-recovery.sh

# Stop application
pm2 stop trm-app

# Stop MongoDB
sudo systemctl stop mongod

# Repair database
sudo mongod --dbpath /var/lib/mongodb --repair

# Or restore from backup
LATEST_BACKUP=$(ls -t /opt/trm/backups/mongodb_*.gz | head -1)
mongorestore --uri="$MONGODB_URI" --gzip --drop --archive="$LATEST_BACKUP"

# Start MongoDB
sudo systemctl start mongod

# Start application
pm2 start trm-app
```

### Support Contacts

| Issue Type | Contact | Escalation |
|------------|---------|------------|
| **Infrastructure** | DevOps Team | CTO |
| **Application** | Engineering Team | Tech Lead |
| **Database** | DBA Team | CTO |
| **Security** | Security Team | CISO |
| **Third-Party** | Vendor Support | Account Manager |

#### Emergency Contacts

- **Primary On-Call**: +95-XXX-XXX-XXXX
- **Secondary On-Call**: +95-XXX-XXX-XXXX
- **Escalation Manager**: +95-XXX-XXX-XXXX

---

## Checklists

### Pre-Deployment Checklist

#### Infrastructure
- [ ] Server provisioned with required specifications
- [ ] Operating system updated and patched
- [ ] Firewall configured (UFW/iptables)
- [ ] SSH access secured (key-based only)
- [ ] Fail2Ban installed and configured
- [ ] Nginx installed and configured
- [ ] SSL certificates obtained and installed
- [ ] Domain DNS records configured
- [ ] Load balancer configured (if applicable)

#### Dependencies
- [ ] Node.js 18+ installed
- [ ] MongoDB 6.0+ installed and secured
- [ ] Redis 7.0+ installed and secured
- [ ] PM2 installed globally
- [ ] Docker installed (if using containers)
- [ ] Git configured

#### Third-Party Services
- [ ] SendGrid account configured
- [ ] AWS account with S3 access
- [ ] Payment gateway accounts (KBZPay, WavePay, AYA Pay)
- [ ] Viber bot created
- [ ] Telegram bot created
- [ ] Twilio account (for SMS)
- [ ] Sentry project created
- [ ] Monitoring tools configured (optional)

#### Security
- [ ] SSL/TLS certificates valid
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] Redis password set
- [ ] JWT secrets generated (32+ characters)
- [ ] Encryption keys generated
- [ ] Security headers configured
- [ ] Rate limiting enabled

### Deployment Day Checklist

#### Pre-Deployment
- [ ] Database backup completed
- [ ] Current version tagged in Git
- [ ] Deployment window communicated to stakeholders
- [ ] Rollback plan reviewed
- [ ] Monitoring dashboards open
- [ ] Team communication channel active

#### Deployment
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database migrations run
- [ ] Application started successfully
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] DNS propagation verified

#### Post-Deployment
- [ ] Smoke tests passed
- [ ] Critical user flows tested
- [ ] Error rates normal
- [ ] Performance metrics acceptable
- [ ] Logs showing no errors
- [ ] Third-party integrations working
- [ ] Monitoring alerts configured

### Post-Deployment Checklist

#### Verification
- [ ] All health checks passing
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] External API integrations working
- [ ] Email delivery working
- [ ] SMS delivery working
- [ ] Payment webhooks receiving
- [ ] File uploads working

#### Documentation
- [ ] Deployment notes documented
- [ ] Any issues encountered logged
- [ ] Configuration changes recorded
- [ ] Performance baseline established

#### Cleanup
- [ ] Old deployments archived
- [ ] Temporary files removed
- [ ] Backup storage verified
- [ ] Monitoring alerts acknowledged

### Go-Live Checklist

#### Final Checks
- [ ] Production URL accessible
- [ ] SSL certificate valid and trusted
- [ ] All pages loading correctly
- [ ] Mobile responsiveness verified
- [ ] Admin panel accessible
- [ ] API documentation accessible

#### User Acceptance
- [ ] Registration flow working
- [ ] Login flow working
- [ ] Job posting working
- [ ] Referral creation working
- [ ] Payment processing working
- [ ] Notifications delivering

#### Monitoring
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring active
- [ ] Uptime monitoring active
- [ ] Alert channels tested
- [ ] On-call schedule active

#### Communication
- [ ] Stakeholders notified of go-live
- [ ] Support team briefed
- [ ] Documentation updated
- [ ] Marketing team notified

---

## Appendix

### A. Environment Variable Reference

See [`.env.production`](../../.env.production) for complete environment variable reference.

### B. API Endpoints Reference

See [`docs/api/v1/openapi.yaml`](../../docs/api/v1/openapi.yaml) for complete API documentation.

### C. Database Schema

See [`docs/technical/database-schema.md`](../../docs/technical/database-schema.md) for database documentation.

### D. Security Documentation

See [`docs/security/SECURITY_IMPLEMENTATION.md`](../../docs/security/SECURITY_IMPLEMENTATION.md) for security details.

### E. Troubleshooting Guide

See [`docs/integration/TROUBLESHOOTING_GUIDE.md`](../../docs/integration/TROUBLESHOOTING_GUIDE.md) for additional troubleshooting.

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-01 | DevOps Team | Initial production deployment guide |

---

**Document Owner**: DevOps Team  
**Review Schedule**: Quarterly  
**Last Updated**: 2024-01-01
