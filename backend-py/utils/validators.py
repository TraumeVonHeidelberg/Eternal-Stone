"""
Data validation module.
Contains functions for input data validation.
"""

from typing import Optional, Dict, Any


class ValidationError(Exception):
    """Exception raised on validation error."""
    pass


def validate_page_number(page: Any) -> int:
    """
    Validate page number.
    
    Args:
        page: Value to validate
        
    Returns:
        int: Validated page number
        
    Raises:
        ValidationError: When page number is invalid
    """
    try:
        page_num = int(page)
        if page_num < 1:
            raise ValidationError("Page number must be greater than 0")
        return page_num
    except (ValueError, TypeError):
        raise ValidationError("Invalid page number")


def validate_anime_id(anime_id: Optional[str]) -> str:
    """
    Validate anime ID.
    
    Args:
        anime_id: ID to validate
        
    Returns:
        str: Validated ID
        
    Raises:
        ValidationError: When ID is invalid
    """
    if not anime_id or not anime_id.strip():
        raise ValidationError("Missing required parameter 'id'")
    return anime_id.strip()


def validate_typing_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate typing test result data.
    
    Args:
        data: Data to validate
        
    Returns:
        dict: Validated data
        
    Raises:
        ValidationError: When data is invalid
    """
    required_fields = ['originalText', 'typedText', 'time']
    
    for field in required_fields:
        if field not in data:
            raise ValidationError(f"Missing required field: {field}")
    
    if not isinstance(data['time'], (int, float)) or data['time'] <= 0:
        raise ValidationError("Time must be a number greater than 0")
    
    return data