"""
Main Flask application file.
Configures and runs the application server.
"""

import logging
from flask import Flask, render_template, request
from flask_cors import CORS

# Add backend-py to path for imports when running from monorepo root
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from utils.error_handlers import register_error_handlers
from api.anime import anime_bp
from api.typing import typing_bp
from api.proxy import proxy_bp
from services.anime_service import AnimeService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """
    Create and configure Flask application.
    
    Args:
        config_class: Configuration class
        
    Returns:
        Flask: Configured application
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}})
    
    # Register blueprints
    app.register_blueprint(anime_bp)
    app.register_blueprint(typing_bp)
    app.register_blueprint(proxy_bp)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Initialize services
    anime_service = AnimeService()
    
    # HTML views (if you use them)
    @app.route('/')
    def index():
        """Main page with search."""
        query = request.args.get('q', '')
        results = []
        
        if query:
            # If there's a search query, show search results
            results = anime_service.search_anime(query)
        else:
            # If no search query, show top airing anime by default
            results = anime_service.get_top_airing()
        
        return render_template('index.html', results=results, query=query)
    
    @app.route('/top')
    def top_airing():
        """Top airing anime page."""
        top_list = anime_service.get_top_airing()
        return render_template('top.html', top=top_list)
    
    logger.info("Application configured successfully")
    return app


# Create application instance
app = create_app()


if __name__ == '__main__':
    logger.info("Starting application server...")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )