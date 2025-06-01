"""
Typing test result model.
Defines data structure for typing test results.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class TypingResult:
    """
    Class representing a typing test result.
    
    Attributes:
        wpm (float): Words per minute
        cpm (float): Characters per minute
        accuracy (float): Accuracy percentage
        errors (int): Number of errors
        time (float): Typing time in seconds
        text_length (int): Length of text
        timestamp (datetime): Test completion time
    """
    wpm: float
    cpm: float
    accuracy: float
    errors: int
    time: float
    text_length: int
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize timestamp if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self) -> dict:
        """
        Convert object to dictionary.
        
        Returns:
            dict: Dictionary representation of object
        """
        return {
            'wpm': self.wpm,
            'cpm': self.cpm,
            'accuracy': self.accuracy,
            'errors': self.errors,
            'time': self.time,
            'textLength': self.text_length,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'TypingResult':
        """
        Create object from dictionary.
        
        Args:
            data: Dictionary with data
            
        Returns:
            TypingResult: Created object
        """
        timestamp = None
        if 'timestamp' in data and data['timestamp']:
            timestamp = datetime.fromisoformat(data['timestamp'])
        
        return cls(
            wpm=data['wpm'],
            cpm=data['cpm'],
            accuracy=data['accuracy'],
            errors=data['errors'],
            time=data['time'],
            text_length=data.get('textLength', 0),
            timestamp=timestamp
        )