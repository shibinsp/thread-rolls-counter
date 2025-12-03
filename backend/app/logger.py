"""
Centralized logging configuration for production
"""
import logging
import sys
from pathlib import Path
import os

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Get log level from environment or default to INFO
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Configure logging format
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'

# Create logger
logger = logging.getLogger("thread_counter")
logger.setLevel(getattr(logging, LOG_LEVEL))

# Remove existing handlers
logger.handlers = []

# Console handler (stdout)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter(LOG_FORMAT)
console_handler.setFormatter(console_formatter)

# File handler (app.log)
file_handler = logging.FileHandler(LOGS_DIR / "app.log")
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(LOG_FORMAT)
file_handler.setFormatter(file_formatter)

# Error file handler (errors.log)
error_handler = logging.FileHandler(LOGS_DIR / "errors.log")
error_handler.setLevel(logging.ERROR)
error_formatter = logging.Formatter(LOG_FORMAT)
error_handler.setFormatter(error_formatter)

# Add handlers
logger.addHandler(console_handler)
logger.addHandler(file_handler)
logger.addHandler(error_handler)

# Prevent propagation to root logger
logger.propagate = False

def get_logger(name: str = None):
    """Get a logger instance"""
    if name:
        return logging.getLogger(f"thread_counter.{name}")
    return logger
