# Database Migration Guide

## Migration Completed ✅

This document describes the migration from SQLite to PostgreSQL, including Alembic setup and Redis integration.

## What Changed

### 1. Database Migration
- **From**: SQLite (`thread_counter.db`)
- **To**: PostgreSQL (database: `thread`, user: `postgres`, password: `shibin`)
- **Status**: ✅ Complete - All data migrated successfully

### 2. Alembic Integration
- **Purpose**: Database schema version control and migrations
- **Location**: `/backend/alembic/`
- **Status**: ✅ Configured and working

### 3. Redis Integration
- **Purpose**: Caching layer (optional, gracefully fails if unavailable)
- **Configuration**: localhost:6379/0
- **Status**: ✅ Configured with helper functions

## Files Added/Modified

### New Files
- `.env` - Environment configuration
- `alembic/` - Migration directory
- `alembic.ini` - Alembic configuration
- `app/redis_client.py` - Redis helper functions
- `export_sqlite_data.py` - Data export script
- `import_to_postgres.py` - Data import script
- `sqlite_export.json` - Exported data backup

### Modified Files
- `app/database.py` - Now supports PostgreSQL
- `app/main.py` - Added Redis imports
- `requirements.txt` - Added psycopg2, alembic, redis

## Environment Configuration

The `.env` file contains:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:shibin@localhost/thread

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Application Settings
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
```

## Running the Application

### Start the Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The application will:
1. Load configuration from `.env`
2. Connect to PostgreSQL (falls back to SQLite if DB_URL not set)
3. Attempt to connect to Redis (continues if unavailable)

## Database Migration Commands

### Create a New Migration
```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations
```bash
alembic upgrade head
```

### Rollback Migrations
```bash
alembic downgrade -1  # Go back one version
alembic downgrade base  # Go back to the beginning
```

### View Migration History
```bash
alembic history
alembic current  # Show current version
```

## Data Verification

### Check Data in PostgreSQL
```bash
PGPASSWORD=shibin psql -U postgres -h localhost -d thread

# Then run:
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM slots;
SELECT COUNT(*) FROM slot_entries;
SELECT COUNT(*) FROM activity_logs;
```

### Backup Data
The SQLite data was exported to `sqlite_export.json` as a backup.

## Redis Usage

### Cache Helper Functions
```python
from app.redis_client import cache_get, cache_set, cache_delete, cache_clear_pattern

# Set cache (expires in 300 seconds by default)
cache_set("dashboard:stats", {"users": 100}, ex=600)

# Get cache
data = cache_get("dashboard:stats")

# Delete cache
cache_delete("dashboard:stats")

# Clear pattern
cache_clear_pattern("dashboard:*")
```

### Check Redis Status
```bash
redis-cli ping  # Should return PONG if running
```

## Migrated Data Summary

| Table           | Count |
|-----------------|-------|
| Users           | 2     |
| Slots           | 1     |
| Slot Entries    | 1     |
| Activity Logs   | 3     |
| Analyses        | 0     |

## Rollback to SQLite (If Needed)

1. Comment out `DATABASE_URL` in `.env`
2. The application will automatically fall back to SQLite
3. The original `thread_counter.db` file is still intact

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
PGPASSWORD=shibin psql -U postgres -h localhost -d thread -c "SELECT 1;"
```

### Redis Connection Issues
```bash
# Check if Redis is running
sudo systemctl status redis

# Start Redis if not running
sudo systemctl start redis
```

### Migration Issues
```bash
# Reset database (CAUTION: Deletes all data)
alembic downgrade base
alembic upgrade head

# Or reimport from backup
python import_to_postgres.py
```

## Best Practices

1. **Always create migrations for schema changes**
   ```bash
   alembic revision --autogenerate -m "Add new column"
   alembic upgrade head
   ```

2. **Use Redis for frequently accessed data**
   - Dashboard statistics
   - User sessions
   - API rate limiting

3. **Backup before migrations**
   ```bash
   pg_dump -U postgres -h localhost thread > backup_$(date +%Y%m%d).sql
   ```

4. **Monitor PostgreSQL performance**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;

   -- Check slow queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

## Production Recommendations

1. **Change SECRET_KEY** in `.env` to a strong random value
2. **Set DEBUG=False** in production
3. **Use connection pooling** (already configured in database.py)
4. **Enable PostgreSQL logging** for monitoring
5. **Set up regular backups**:
   ```bash
   # Add to crontab for daily backups
   0 2 * * * pg_dump -U postgres thread > /backups/thread_$(date +\%Y\%m\%d).sql
   ```
6. **Configure Redis persistence** (RDB or AOF)
7. **Use environment-specific `.env` files**

## Support

For issues or questions:
1. Check the logs: `tail -f /var/log/postgresql/postgresql-XX-main.log`
2. Review Alembic history: `alembic history`
3. Verify Redis: `redis-cli monitor`
