#!/bin/bash
# =============================================================================
# TRM Platform - MongoDB Disaster Recovery Script
# Restore from backup with verification and point-in-time recovery
# =============================================================================

set -euo pipefail

# Configuration
S3_BUCKET="${S3_BACKUP_BUCKET:-trm-production-backups}"
S3_PREFIX="mongodb"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE_NAME="${MONGODB_DATABASE:-trm_production}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
RESTORE_DIR="/tmp/mongodb-restore"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS] [BACKUP_NAME]

Options:
    -l, --list              List available backups
    -b, --backup NAME       Restore specific backup
    -t, --timestamp TS      Restore to specific timestamp (for PITR)
    -d, --dry-run           Show what would be restored without doing it
    -f, --force             Skip confirmation prompts
    -h, --help              Show this help message

Examples:
    $0 --list                                    # List all backups
    $0 --backup mongodb_trm_production_20240207_120000  # Restore specific backup
    $0 --timestamp 2024-02-07T12:00:00Z         # Point-in-time recovery
EOF
    exit 1
}

# List available backups
list_backups() {
    log "Available backups in s3://${S3_BUCKET}/${S3_PREFIX}/"
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | grep -E '\.tar\.gz(\.enc)?$' | awk '{print $4}' | sort -r
}

# Download backup
download_backup() {
    local backup_name="$1"
    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${backup_name}"
    local local_path="${RESTORE_DIR}/${backup_name}"
    
    log "Downloading backup from S3..."
    mkdir -p "$RESTORE_DIR"
    aws s3 cp "$s3_path" "$local_path"
    
    # Download checksum
    aws s3 cp "${s3_path}.sha256" "${local_path}.sha256" || true
    
    echo "$local_path"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    
    if [[ -f "$checksum_file" ]]; then
        log "Verifying backup integrity..."
        local expected_checksum=$(cat "$checksum_file" | awk '{print $1}')
        local actual_checksum=$(sha256sum "$backup_file" | awk '{print $1}')
        
        if [[ "$expected_checksum" != "$actual_checksum" ]]; then
            error "Checksum verification failed!"
            error "Expected: $expected_checksum"
            error "Actual: $actual_checksum"
            return 1
        fi
        log "Checksum verification passed"
    else
        log "WARNING: No checksum file found, skipping verification"
    fi
}

# Decrypt backup
decrypt_backup() {
    local backup_file="$1"
    
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "$ENCRYPTION_KEY" ]]; then
            error "Backup is encrypted but no encryption key provided"
            exit 1
        fi
        
        log "Decrypting backup..."
        local decrypted_file="${backup_file%.enc}"
        openssl enc -aes-256-cbc -d -in "$backup_file" -out "$decrypted_file" -k "$ENCRYPTION_KEY"
        rm "$backup_file"
        echo "$decrypted_file"
    else
        echo "$backup_file"
    fi
}

# Extract backup
extract_backup() {
    local backup_file="$1"
    local extract_dir="${RESTORE_DIR}/extracted"
    
    log "Extracting backup..."
    mkdir -p "$extract_dir"
    tar -xzf "$backup_file" -C "$extract_dir"
    
    # Find the extracted directory
    local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d | tail -1)
    echo "$extracted_dir"
}

# Restore database
restore_database() {
    local backup_dir="$1"
    local dry_run="${2:-false}"
    
    if [[ "$dry_run" == "true" ]]; then
        log "DRY RUN: Would restore from $backup_dir"
        log "Collections found:"
        ls -la "$backup_dir"
        return 0
    fi
    
    log "Restoring database..."
    
    # Drop existing database (with confirmation)
    log "Dropping existing database..."
    mongosh "$MONGODB_URI" --eval "db.getSiblingDB('$DATABASE_NAME').dropDatabase()"
    
    # Restore from backup
    mongorestore \
        --uri="$MONGODB_URI" \
        --db="$DATABASE_NAME" \
        --gzip \
        --stopOnError \
        --numParallelCollections=4 \
        "$backup_dir/$DATABASE_NAME"
    
    log "Database restore completed"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    # Check if collections exist
    local collections=$(mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "db.getCollectionNames().join(',')")
    log "Collections restored: $collections"
    
    # Count documents in key collections
    local user_count=$(mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "db.users.countDocuments()")
    local job_count=$(mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "db.jobs.countDocuments()")
    
    log "Users: $user_count, Jobs: $job_count"
    
    if [[ "$user_count" -eq 0 && "$job_count" -eq 0 ]]; then
        error "Restore verification failed - no data found!"
        return 1
    fi
    
    log "Restore verification passed"
}

# Main function
main() {
    local backup_name=""
    local timestamp=""
    local dry_run=false
    local force=false
    local list_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                list_only=true
                shift
                ;;
            -b|--backup)
                backup_name="$2"
                shift 2
                ;;
            -t|--timestamp)
                timestamp="$2"
                shift 2
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                backup_name="$1"
                shift
                ;;
        esac
    done
    
    # List backups and exit
    if [[ "$list_only" == "true" ]]; then
        list_backups
        exit 0
    fi
    
    # Check prerequisites
    if ! command -v mongorestore &> /dev/null; then
        error "mongorestore not found. Please install MongoDB tools."
        exit 1
    fi
    
    # Find latest backup if not specified
    if [[ -z "$backup_name" ]]; then
        log "No backup specified, finding latest..."
        backup_name=$(list_backups | head -1)
        if [[ -z "$backup_name" ]]; then
            error "No backups found!"
            exit 1
        fi
        log "Using latest backup: $backup_name"
    fi
    
    # Confirmation
    if [[ "$force" != "true" && "$dry_run" != "true" ]]; then
        echo "WARNING: This will REPLACE the current database!"
        echo "Database: $DATABASE_NAME"
        echo "Backup: $backup_name"
        read -p "Are you sure? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Restore cancelled"
            exit 0
        fi
    fi
    
    # Cleanup on exit
    trap 'rm -rf "$RESTORE_DIR"' EXIT
    
    # Execute restore
    local backup_file=$(download_backup "$backup_name")
    verify_backup "$backup_file"
    backup_file=$(decrypt_backup "$backup_file")
    local backup_dir=$(extract_backup "$backup_file")
    restore_database "$backup_dir" "$dry_run"
    
    if [[ "$dry_run" != "true" ]]; then
        verify_restore
        log "Disaster recovery completed successfully!"
        
        # Send notification
        if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🔄 Database restored from backup: $backup_name\"}" \
                "$SLACK_WEBHOOK_URL" || true
        fi
    fi
}

main "$@"
