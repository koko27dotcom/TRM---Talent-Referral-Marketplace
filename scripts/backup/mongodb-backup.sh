#!/bin/bash
# =============================================================================
# TRM Platform - MongoDB Backup Script
# Production-grade backup with compression, encryption, and S3 upload
# Following AWS and Google SRE best practices
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backup/mongodb"
S3_BUCKET="${S3_BACKUP_BUCKET:-trm-production-backups}"
S3_PREFIX="mongodb"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE_NAME="${MONGODB_DATABASE:-trm_production}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_${DATABASE_NAME}_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting MongoDB backup for database: $DATABASE_NAME"

# Check prerequisites
if ! command -v mongodump &> /dev/null; then
    error "mongodump not found. Please install MongoDB tools."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    error "AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Create backup
log "Creating database dump..."
mongodump \
    --uri="$MONGODB_URI" \
    --db="$DATABASE_NAME" \
    --out="$BACKUP_PATH" \
    --gzip \
    --oplog \
    --numParallelCollections=4

# Compress backup
log "Compressing backup..."
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

# Encrypt backup if key provided
if [[ -n "$ENCRYPTION_KEY" ]]; then
    log "Encrypting backup..."
    openssl enc -aes-256-cbc -salt -in "${BACKUP_PATH}.tar.gz" \
        -out "${BACKUP_PATH}.tar.gz.enc" -k "$ENCRYPTION_KEY"
    rm "${BACKUP_PATH}.tar.gz"
    BACKUP_FILE="${BACKUP_PATH}.tar.gz.enc"
else
    log "WARNING: No encryption key provided. Backup will be stored unencrypted."
    BACKUP_FILE="${BACKUP_PATH}.tar.gz"
fi

# Calculate checksum
log "Calculating checksum..."
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM" > "${BACKUP_FILE}.sha256"

# Upload to S3
log "Uploading to S3..."
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/" --storage-class STANDARD_IA
aws s3 cp "${BACKUP_FILE}.sha256" "s3://${S3_BUCKET}/${S3_PREFIX}/"

# Create metadata file
cat > "${BACKUP_PATH}.meta.json" <<EOF
{
    "database": "$DATABASE_NAME",
    "timestamp": "$TIMESTAMP",
    "backup_name": "$BACKUP_NAME",
    "checksum": "$CHECKSUM",
    "encrypted": $([[ -n "$ENCRYPTION_KEY" ]] && echo "true" || echo "false"),
    "s3_location": "s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$BACKUP_FILE")",
    "retention_days": $RETENTION_DAYS
}
EOF

aws s3 cp "${BACKUP_PATH}.meta.json" "s3://${S3_BUCKET}/${S3_PREFIX}/"

# Cleanup local files
rm -f "$BACKUP_FILE" "${BACKUP_FILE}.sha256" "${BACKUP_PATH}.meta.json"

# Cleanup old backups (S3 lifecycle policy should also be configured)
log "Cleaning up old backups..."
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | \
    awk '{print $4}' | \
    while read -r file; do
        FILE_DATE=$(echo "$file" | grep -oP '\d{8}_\d{6}' || true)
        if [[ -n "$FILE_DATE" ]]; then
            FILE_TIMESTAMP=$(date -d "${FILE_DATE:0:8} ${FILE_DATE:9:2}:${FILE_DATE:11:2}:${FILE_DATE:13:2}" +%s 2>/dev/null || echo 0)
            CUTOFF_TIMESTAMP=$(date -d "$RETENTION_DAYS days ago" +%s)
            if [[ $FILE_TIMESTAMP -lt $CUTOFF_TIMESTAMP ]]; then
                log "Deleting old backup: $file"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/$file"
            fi
        fi
    done

# Verify backup
log "Verifying backup..."
LATEST_BACKUP=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | grep "${BACKUP_NAME}" | tail -1)
if [[ -n "$LATEST_BACKUP" ]]; then
    log "Backup completed successfully: $BACKUP_NAME"
    
    # Send success notification (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ MongoDB backup completed: $BACKUP_NAME\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
else
    error "Backup verification failed!"
    
    # Send failure notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"❌ MongoDB backup FAILED: $BACKUP_NAME\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    exit 1
fi

log "Backup process completed"
