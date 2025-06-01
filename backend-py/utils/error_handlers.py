"""
Error handling module.
Contains decorators and functions for exception handling.
"""

from functools import wraps
from flask import jsonify
import logging

logger = logging.getLogger(__name__)


def handle_errors(default_message="An error occurred", default_code=500):
    """
    Decorator for handling errors in API endpoints.
    
    Args:
        default_message (str): Default error message
        default_code (int): Default HTTP error code
        
    Returns:
        function: Decorated function with error handling
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {f.__name__}: {str(e)}", exc_info=True)
                return jsonify({
                    "error": default_message,
                    "details": str(e) if logger.level == logging.DEBUG else None
                }), default_code
        return decorated_function
    return decorator


def register_error_handlers(app):
    """
    Register global error handlers for Flask application.
    
    Args:
        app: Flask application instance
    """
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request"}), 400
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({"error": "Internal server error"}), 500