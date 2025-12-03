"""
Redis client configuration and helper functions
"""
import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Create Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    print(f"✓ Redis connected: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")
except (redis.ConnectionError, redis.TimeoutError) as e:
    print(f"⚠ Redis not available: {e}")
    redis_client = None
    REDIS_AVAILABLE = False

# Cache helper functions
def cache_set(key: str, value: any, ex: int = 300):
    """
    Set a cache value with expiration
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ex: Expiration in seconds (default: 5 minutes)
    """
    if not REDIS_AVAILABLE or redis_client is None:
        return False
    try:
        serialized = json.dumps(value)
        redis_client.set(key, serialized, ex=ex)
        return True
    except Exception as e:
        print(f"Redis cache_set error: {e}")
        return False

def cache_get(key: str):
    """
    Get a cached value
    Returns None if not found or Redis unavailable
    """
    if not REDIS_AVAILABLE or redis_client is None:
        return None
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        print(f"Redis cache_get error: {e}")
        return None

def cache_delete(key: str):
    """Delete a cache key"""
    if not REDIS_AVAILABLE or redis_client is None:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Redis cache_delete error: {e}")
        return False

def cache_clear_pattern(pattern: str):
    """
    Clear all keys matching a pattern
    Example: cache_clear_pattern('user:*')
    """
    if not REDIS_AVAILABLE or redis_client is None:
        return False
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
        return True
    except Exception as e:
        print(f"Redis cache_clear_pattern error: {e}")
        return False
