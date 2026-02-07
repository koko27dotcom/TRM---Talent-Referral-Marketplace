# TRM Referral Platform - Cloud Deployment Guides

This document provides detailed deployment instructions for major cloud providers.

---

## Table of Contents

1. [AWS Deployment](#aws-deployment)
2. [Google Cloud Platform (GCP)](#google-cloud-platform-gcp)
3. [Microsoft Azure](#microsoft-azure)
4. [Alibaba Cloud](#alibaba-cloud)
5. [DigitalOcean](#digitalocean)

---

## AWS Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        Route 53 (DNS)                          │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    CloudFront (CDN)                            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                  Application Load Balancer                     │  │
│  │              (SSL Termination, Health Checks)                  │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    ECS / EKS Cluster                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  App Node 1 │  │  App Node 2 │  │  App Node 3 │            │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐    ┌───────▼────────┐   ┌──────▼──────┐           │
│  │ DocumentDB  │    │ ElastiCache    │   │     S3      │           │
│  │ (MongoDB)   │    │ (Redis)        │   │ (Storage)   │           │
│  └─────────────┘    └────────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Domain registered in Route 53 (or external DNS)
- SSL certificate in ACM (AWS Certificate Manager)

### Step 1: Infrastructure Setup with Terraform

```hcl
# terraform/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "trm-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Environment = var.environment
    Project     = "trm"
  }
}

# Security Groups
resource "aws_security_group" "app" {
  name_prefix = "trm-app-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "trm-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "trm-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "trm-app"
      image = "${aws_ecr_repository.app.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
      secrets = [
        {
          name      = "MONGODB_URI"
          valueFrom = aws_secretsmanager_secret.mongodb.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "trm-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "trm-app"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "trm-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "app" {
  name     = "trm-app-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# DocumentDB (MongoDB compatible)
resource "aws_docdb_cluster" "main" {
  cluster_identifier   = "trm-docdb"
  engine              = "docdb"
  master_username     = "trm_admin"
  master_password     = random_password.docdb.result
  skip_final_snapshot = false
  vpc_security_group_ids = [aws_security_group.docdb.id]
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
}

resource "aws_docdb_cluster_instance" "main" {
  count              = 2
  identifier         = "trm-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.r5.large"
}

# ElastiCache (Redis)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "trm-redis"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.redis.id]
  subnet_group_name    = aws_elasticache_subnet_group.main.name
}

# S3 Bucket for uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "trm-production-uploads"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled = true
  aliases = ["myanjobs.com", "www.myanjobs.com"]

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id   = "S3"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/uploads/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl               = 86400
    default_ttl           = 604800
    max_ttl               = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Route 53
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myanjobs.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

### Step 2: Deploy with AWS CLI

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply deployment
terraform apply tfplan

# Get outputs
terraform output
```

### Step 3: Deploy Application to ECR

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com

# Build image
docker build -t trm-app:latest .

# Tag image
docker tag trm-app:latest <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/trm-app:latest

# Push image
docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/trm-app:latest

# Update ECS service
aws ecs update-service --cluster trm-cluster --service trm-app --force-new-deployment
```

---

## Google Cloud Platform (GCP)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                              GCP                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Cloud DNS                                   │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                  Cloud CDN + Load Balancer                     │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    Cloud Run / GKE                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  App Pod 1  │  │  App Pod 2  │  │  App Pod 3  │            │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐    ┌───────▼────────┐   ┌──────▼──────┐           │
│  │ MongoDB     │    │ Memorystore    │   │ Cloud       │           │
│  │ Atlas       │    │ (Redis)        │   │ Storage     │           │
│  │ (or Atlas)  │    │                │   │             │           │
│  └─────────────┘    └────────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment with Cloud Run

```bash
# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create secrets
echo -n "your-mongodb-uri" | gcloud secrets create mongodb-uri --data-file=-
echo -n "your-redis-url" | gcloud secrets create redis-url --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-

# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/trm-app

gcloud run deploy trm-app \
  --image gcr.io/PROJECT_ID/trm-app \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets "MONGODB_URI=mongodb-uri:latest" \
  --set-secrets "REDIS_URL=redis-url:latest" \
  --set-secrets "JWT_SECRET=jwt-secret:latest" \
  --set-env-vars "NODE_ENV=production" \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 100 \
  --max-instances 10 \
  --min-instances 1

# Get URL
gcloud run services describe trm-app --region asia-southeast1 --format 'value(status.url)'
```

### Deployment with GKE (Kubernetes)

```bash
# Create GKE cluster
gcloud container clusters create trm-cluster \
  --zone asia-southeast1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --enable-autorepair

# Get credentials
gcloud container clusters get-credentials trm-cluster --zone asia-southeast1-a

# Deploy using existing k8s manifests
kubectl apply -f k8s/

# Or use Helm
helm install trm ./helm/trm-platform
```

---

## Microsoft Azure

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                              Azure                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Azure DNS                                   │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │              Azure Front Door / CDN                            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │              Application Gateway / Load Balancer               │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │              AKS / Container Instances                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  App Pod 1  │  │  App Pod 2  │  │  App Pod 3  │            │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐    ┌───────▼────────┐   ┌──────▼──────┐           │
│  │ Cosmos DB   │    │ Azure Cache    │   │ Blob        │           │
│  │ (MongoDB)   │    │ for Redis      │   │ Storage     │           │
│  └─────────────┘    └────────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment with Azure Container Instances

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
  --dns-name-label trm-app \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables \
    MONGODB_URI="your-mongodb-uri" \
    REDIS_URL="your-redis-url" \
    JWT_SECRET="your-jwt-secret"

# Get FQDN
az container show --resource-group trm-rg --name trm-app --query ipAddress.fqdn
```

### Deployment with AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group trm-rg \
  --name trm-cluster \
  --node-count 3 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 10 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group trm-rg --name trm-cluster

# Deploy
kubectl apply -f k8s/
```

---

## Alibaba Cloud

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Alibaba Cloud                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Alibaba Cloud DNS                           │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    CDN (DCDN)                                  │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    SLB (Server Load Balancer)                  │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    ACK (Container Service)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  App Pod 1  │  │  App Pod 2  │  │  App Pod 3  │            │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐    ┌───────▼────────┐   ┌──────▼──────┐           │
│  │ ApsaraDB    │    │ ApsaraDB       │   │ OSS         │           │
│  │ for MongoDB │    │ for Redis      │   │ (Storage)   │           │
│  └─────────────┘    └────────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment with ACK

```bash
# Configure aliyun CLI
aliyun configure

# Create ACK cluster
aliyun cs POST /clusters \
  --body '{
    "name": "trm-cluster",
    "cluster_type": "ManagedKubernetes",
    "region_id": "ap-southeast-1",
    "vpc_id": "vpc-xxx",
    "vswitch_ids": ["vsw-xxx"],
    "worker_instance_types": ["ecs.c6.xlarge"],
    "num_of_nodes": 3,
    "key_pair": "trm-key"
  }'

# Get kubeconfig
aliyun cs GET /k8s/[cluster-id]/user_config

# Deploy
kubectl apply -f k8s/
```

---

## DigitalOcean

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DigitalOcean                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DigitalOcean DNS                            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    Load Balancer                               │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                    App Platform / Kubernetes                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  App Pod 1  │  │  App Pod 2  │  │  App Pod 3  │            │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                  │
│         │                    │                    │                  │
│  ┌──────▼──────┐    ┌───────▼────────┐   ┌──────▼──────┐           │
│  │ MongoDB     │    │ Redis          │   │ Spaces      │           │
│  │ (Managed)   │    │ (Managed)      │   │ (S3)        │           │
│  └─────────────┘    └────────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment with App Platform

```yaml
# .do/app.yaml
name: trm-platform
services:
  - name: api
    source_dir: /
    github:
      repo: your-org/trm-platform
      branch: main
    build_command: npm ci && npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 3
    instance_size_slug: professional-xs
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        value: ${mongodb.DATABASE_URL}
      - key: REDIS_URL
        value: ${redis.DATABASE_URL}
    http_port: 3000
    routes:
      - path: /
    health_check:
      http_path: /api/health
      port: 3000

databases:
  - name: mongodb
    engine: MONGODB
    version: "6"
    size: professional-xs
    num_nodes: 1
    
  - name: redis
    engine: REDIS
    version: "7"
    size: professional-xs
    num_nodes: 1
```

```bash
# Deploy using doctl
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps update <app-id> --spec .do/app.yaml
```

### Deployment with DigitalOcean Kubernetes

```bash
# Create Kubernetes cluster
doctl kubernetes cluster create trm-cluster \
  --region sgp1 \
  --version 1.28 \
  --node-pool "name=trm-pool;size=s-4vcpu-8gb;n-nodes=3;auto-scale=true;min-nodes=1;max-nodes=10"

# Save kubeconfig
doctl kubernetes cluster kubeconfig save trm-cluster

# Deploy
kubectl apply -f k8s/
```

---

## Common Configuration

### Environment Variables for All Cloud Providers

```bash
# Core Application
NODE_ENV=production
PORT=3000
API_URL=https://api.myanjobs.com
FRONTEND_URL=https://myanjobs.com

# Database (Use managed service connection strings)
MONGODB_URI=<managed-mongodb-uri>
REDIS_URL=<managed-redis-uri>

# Security
JWT_SECRET=<generate-strong-secret>
ENCRYPTION_KEY=<generate-32-char-key>
CORS_ORIGIN=https://myanjobs.com

# Storage (Use cloud provider object storage)
AWS_S3_BUCKET=<bucket-name>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
# OR
GCS_BUCKET=<bucket-name>
GOOGLE_APPLICATION_CREDENTIALS=<service-account-json>
# OR
AZURE_STORAGE_ACCOUNT=<account-name>
AZURE_STORAGE_KEY=<storage-key>

# Monitoring
SENTRY_DSN=<sentry-dsn>
DATADOG_API_KEY=<datadog-key>
```

### CI/CD Pipeline Examples

#### GitHub Actions for AWS

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-southeast-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: trm-app
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster trm-cluster --service trm-app --force-new-deployment
```

#### GitHub Actions for GCP

```yaml
# .github/workflows/deploy-gcp.yml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup GCP
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and push
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/trm-app:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy trm-app \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/trm-app:${{ github.sha }} \
            --region asia-southeast1 \
            --platform managed
```

---

## Cost Optimization Tips

### AWS
- Use Spot Instances for non-critical workloads
- Enable Savings Plans for predictable workloads
- Use S3 Intelligent-Tiering for storage
- Configure Auto Scaling to match demand

### GCP
- Use Preemptible VMs for batch jobs
- Enable Committed Use Discounts
- Use Cloud Storage Nearline/Coldline for backups
- Configure Autoscaling policies

### Azure
- Use Reserved Instances for long-term workloads
- Enable Azure Hybrid Benefit
- Use Cool/Archive storage tiers
- Configure VM Scale Sets

### All Providers
- Use CDN for static assets
- Implement proper caching strategies
- Monitor and right-size resources
- Use infrastructure as code for consistency
