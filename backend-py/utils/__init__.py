"""
Utilities package.
Contains helper functions and error handling utilities.
"""

from .error_handlers import handle_errors, register_error_handlers
from .validators import (
    ValidationError,
    validate_page_number,
    validate_anime_id,
    validate_typing_result
)

__all__ = [
    'handle_errors',
    'register_error_handlers',
    'ValidationError',
    'validate_page_number',
    'validate_anime_id',
    'validate_typing_result'
]