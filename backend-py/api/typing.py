"""
Typing test API module.
Contains endpoints for typing speed test functionality.
"""

from flask import Blueprint, request, jsonify
import logging

# Import from parent directory when running from monorepo root
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.typing_service import TypingService
from utils.error_handlers import handle_errors
from utils.validators import validate_typing_result, ValidationError

logger = logging.getLogger(__name__)

# Create blueprint
typing_bp = Blueprint('typing', __name__, url_prefix='/api/typing')

# Initialize service
typing_service = TypingService()


@typing_bp.route("/get-text")
@handle_errors("Error fetching text")
def get_typing_text():
    """
    Get random text for typing test.
    
    Query params:
        lang (str): Text language (default 'en')
        
    Returns:
        JSON: Object with text
    """
    language = request.args.get('lang', 'en')
    text = typing_service.get_random_text(language)
    return jsonify({'text': text})


@typing_bp.route("/submit-result", methods=['POST'])
@handle_errors("Error saving result")
def submit_typing_result():
    """
    Submit typing test result.
    
    Body (JSON):
        originalText (str): Original text
        typedText (str): Typed text
        time (float): Typing time in seconds
        
    Returns:
        JSON: Calculated statistics
    """
    try:
        data = validate_typing_result(request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    
    # Calculate statistics
    result = typing_service.calculate_statistics(
        data['originalText'],
        data['typedText'],
        data['time']
    )
    
    # Save result
    typing_service.save_result(result)
    
    return jsonify(result.to_dict())


@typing_bp.route("/results")
@handle_errors("Error fetching results")
def get_typing_results_api():
    """
    Get all typing test results.
    
    Returns:
        JSON: List of results
    """
    results = typing_service.get_all_results()
    return jsonify(results)


@typing_bp.route("/statistics")
@handle_errors("Error calculating statistics")
def get_typing_statistics():
    """
    Get aggregate typing test statistics.
    
    Returns:
        JSON: Statistics
    """
    stats = typing_service.get_statistics()
    return jsonify(stats)


@typing_bp.route("/clear-history", methods=['POST'])
@handle_errors("Error clearing history")
def clear_typing_history():
    """
    Clear typing test history.
    
    Returns:
        JSON: Operation status
    """
    typing_service.clear_history()
    return jsonify({'success': True})