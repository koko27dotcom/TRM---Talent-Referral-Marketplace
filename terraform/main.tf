# =============================================================================
# TRM Platform - Terraform Infrastructure
# AWS EKS-based production infrastructure
# Following AWS Well-Architected Framework and Terraform best practices
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "trm-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "trm-terraform-locks"
  }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TRM"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# =============================================================================
# VPC Configuration
# =============================================================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "trm-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_ipv6            = false

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/trm-${var.environment}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/trm-${var.environment}" = "shared"
  }

  tags = {
    Name = "trm-${var.environment}-vpc"
  }
}

# =============================================================================
# EKS Cluster
# =============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "trm-${var.environment}"
  cluster_version = "1.28"

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    general = {
      desired_size = var.node_desired_size
      min_size     = var.node_min_size
      max_size     = var.node_max_size

      instance_types = var.node_instance_types
      capacity_type  = var.environment == "production" ? "ON_DEMAND" : "SPOT"

      disk_size = 100

      labels = {
        workload = "general"
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 25
      }

      tags = {
        Name = "trm-${var.environment}-general"
      }
    }

    spot = {
      desired_size = var.spot_desired_size
      min_size     = var.spot_min_size
      max_size     = var.spot_max_size

      instance_types = ["m6i.large", "m5.large", "m5a.large"]
      capacity_type  = "SPOT"

      disk_size = 100

      labels = {
        workload = "spot"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = {
        Name = "trm-${var.environment}-spot"
      }
    }
  }

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
      configuration_values = jsonencode({
        computeType = "Fargate"
        resources = {
          limits = {
            cpu    = "1"
            memory = "512M"
          }
        }
      })
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # IRSA (IAM Roles for Service Accounts)
  enable_irsa = true

  # Cluster security group
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  tags = {
    Name = "trm-${var.environment}"
  }
}

# =============================================================================
# RDS (MongoDB Alternative - DocumentDB)
# =============================================================================

resource "aws_docdb_cluster" "main" {
  count = var.enable_documentdb ? 1 : 0

  cluster_identifier      = "trm-${var.environment}"
  engine                  = "docdb"
  master_username         = var.docdb_username
  master_password         = var.docdb_password
  backup_retention_period = 35
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = var.environment != "production"
  deletion_protection     = var.environment == "production"

  vpc_security_group_ids = [aws_security_group.docdb[0].id]
  db_subnet_group_name   = aws_docdb_subnet_group.main[0].name

  storage_encrypted = true

  tags = {
    Name = "trm-${var.environment}"
  }
}

resource "aws_docdb_cluster_instance" "main" {
  count = var.enable_documentdb ? var.docdb_instance_count : 0

  identifier         = "trm-${var.environment}-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main[0].id
  instance_class     = var.docdb_instance_class

  tags = {
    Name = "trm-${var.environment}-${count.index + 1}"
  }
}

resource "aws_docdb_subnet_group" "main" {
  count = var.enable_documentdb ? 1 : 0

  name       = "trm-${var.environment}"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "trm-${var.environment}"
  }
}

# =============================================================================
# ElastiCache (Redis)
# =============================================================================

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "trm-${var.environment}"
  description          = "Redis cluster for TRM ${var.environment}"

  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_clusters
  port                 = 6379
  parameter_group_name = "default.redis7"

  automatic_failover_enabled = true
  multi_az_enabled          = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token

  snapshot_retention_limit = 35
  snapshot_window          = "05:00-06:00"

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Name = "trm-${var.environment}"
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "trm-${var.environment}"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "trm-${var.environment}"
  }
}

# =============================================================================
# S3 Buckets
# =============================================================================

resource "aws_s3_bucket" "backups" {
  bucket = "trm-${var.environment}-backups-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "trm-${var.environment}-backups"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# Security Groups
# =============================================================================

resource "aws_security_group" "docdb" {
  count = var.enable_documentdb ? 1 : 0

  name_prefix = "trm-${var.environment}-docdb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "MongoDB from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "trm-${var.environment}-docdb"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "trm-${var.environment}-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Redis from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "trm-${var.environment}-redis"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# CloudWatch Log Groups
# =============================================================================

resource "aws_cloudwatch_log_group" "application" {
  name              = "/trm/${var.environment}/application"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = {
    Name = "trm-${var.environment}-application"
  }
}

resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/trm-${var.environment}/cluster"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = {
    Name = "trm-${var.environment}-eks"
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "docdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = var.enable_documentdb ? aws_docdb_cluster.main[0].endpoint : null
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "s3_backup_bucket" {
  description = "S3 backup bucket name"
  value       = aws_s3_bucket.backups.id
}
