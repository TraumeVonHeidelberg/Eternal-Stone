"""
Application configuration module.
Contains all configuration constants used in the application.
"""

import os


class Config:
    """Application configuration class."""
    
    # Flask configuration
    DEBUG = True
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    
    # External API configuration
    BASE_API_URL = "http://localhost:3000/anime/zoro"
    REQUEST_TIMEOUT = 10
    
    # Data storage
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    TYPING_RESULTS_FILE = os.path.join(DATA_DIR, 'typing_results.json')
    MAX_TYPING_RESULTS = 1000
    
    # Proxy configuration
    PROXY_TIMEOUT = 15
    PROXY_CHUNK_SIZE = 8192
    PROXY_DEFAULT_REFERER = "https://zoro.to"
    
    # CORS configuration
    CORS_ORIGINS = "*"