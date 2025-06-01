"""
Typing test service module.
Contains business logic for typing test functionality.
"""

import json
import os
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

# Import from parent directory when running from monorepo root
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from models.typing_result import TypingResult

logger = logging.getLogger(__name__)


class TypingService:
    """Service class for typing tests."""
    
    # Typing test texts
    TYPING_TEXTS = {
        'en': [
            "The magical girl twirled her wand and transformed with sparkles and ribbons.",
            "Schoolgirl anime often feature cherry blossoms falling in the background.",
            "She always brings homemade bentos for her friends during lunch break.",
            "The shy anime girl speaks softly but hides great inner strength.",
            "In every episode, the cheerful heroine finds a way to make everyone smile.",
            "Her eyes sparkled like stars when she saw her favorite idol on stage.",
            "The class representative wears glasses and takes her duties very seriously.",
            "A tsundere girl might act cold, but her blush always gives her away.",
            "Anime girls often wear sailor-style uniforms called 'seifuku'.",
            "She tripped over nothing, again — a true clumsy anime moment.",
            "They formed a school club to chase their dreams and grow together.",
            "The little sister character always calls her sibling 'onii-chan' with energy.",
            "She practices archery after school, her long hair swaying in the wind.",
            "Kawaii girls in slice-of-life anime often bond over tea and cake.",
            "Even during a zombie apocalypse, the anime girls keep their spirits high.",
            "Her magical creature companion floats beside her and gives advice.",
            "Rainy days in anime often mean quiet scenes with umbrellas and shy glances.",
            "Every anime girl has a unique hairstyle — twintails, drills, buns or bob cuts.",
            "The festival episode always features yukata, cotton candy, and fireworks.",
            "She vowed to protect her friends with the power of love and courage."
        ]
    }
    
    def __init__(self, results_file: str = Config.TYPING_RESULTS_FILE):
        """
        Initialize typing test service.
        
        Args:
            results_file: Path to results file
        """
        self.results_file = results_file
        self._ensure_data_dir()
    
    def _ensure_data_dir(self):
        """Create data directory if it doesn't exist."""
        os.makedirs(os.path.dirname(self.results_file), exist_ok=True)
    
    def get_random_text(self, language: str = 'en') -> str:
        """
        Get random text for typing test.
        
        Args:
            language: Text language
            
        Returns:
            str: Random text
        """
        texts = self.TYPING_TEXTS.get(language, self.TYPING_TEXTS['en'])
        return random.choice(texts)
    
    def calculate_statistics(self, original_text: str, typed_text: str, time_seconds: float) -> TypingResult:
        """
        Calculate typing test statistics.
        
        Args:
            original_text: Original text
            typed_text: Typed text
            time_seconds: Typing time in seconds
            
        Returns:
            TypingResult: Calculated statistics
        """
        # Words per minute
        words = len(original_text.split())
        wpm = round((words / time_seconds) * 60, 2) if time_seconds > 0 else 0
        
        # Characters per minute
        cpm = round((len(original_text) / time_seconds) * 60, 2) if time_seconds > 0 else 0
        
        # Accuracy
        correct_chars = sum(
            1 for i in range(min(len(original_text), len(typed_text)))
            if i < len(original_text) and i < len(typed_text) and original_text[i] == typed_text[i]
        )
        accuracy = round((correct_chars / len(original_text)) * 100, 2) if original_text else 0
        
        # Errors
        errors = 0
        for i in range(max(len(original_text), len(typed_text))):
            if i >= len(original_text) or i >= len(typed_text) or original_text[i] != typed_text[i]:
                errors += 1
        
        return TypingResult(
            wpm=wpm,
            cpm=cpm,
            accuracy=accuracy,
            errors=errors,
            time=time_seconds,
            text_length=len(original_text)
        )
    
    def save_result(self, result: TypingResult) -> None:
        """
        Save typing test result.
        
        Args:
            result: Result to save
        """
        try:
            results = self.get_all_results()
            results.append(result.to_dict())
            
            # Keep only last N results
            if len(results) > Config.MAX_TYPING_RESULTS:
                results = results[-Config.MAX_TYPING_RESULTS:]
            
            with open(self.results_file, 'w') as f:
                json.dump(results, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving typing result: {e}")
            raise
    
    def get_all_results(self) -> List[Dict[str, Any]]:
        """
        Get all typing test results.
        
        Returns:
            list: List of results
        """
        if not os.path.exists(self.results_file):
            return []
        
        try:
            with open(self.results_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error reading typing results: {e}")
            return []
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Calculate statistics for all tests.
        
        Returns:
            dict: Aggregate statistics
        """
        results = self.get_all_results()
        
        if not results:
            return {
                'totalTests': 0,
                'averageWpm': 0,
                'averageCpm': 0,
                'averageAccuracy': 0,
                'bestWpm': 0,
                'bestAccuracy': 0
            }
        
        wpm_values = [r['wpm'] for r in results]
        cpm_values = [r['cpm'] for r in results]
        accuracy_values = [r['accuracy'] for r in results]
        
        return {
            'totalTests': len(results),
            'averageWpm': round(sum(wpm_values) / len(wpm_values), 2),
            'averageCpm': round(sum(cpm_values) / len(cpm_values), 2),
            'averageAccuracy': round(sum(accuracy_values) / len(accuracy_values), 2),
            'bestWpm': max(wpm_values),
            'bestAccuracy': max(accuracy_values)
        }
    
    def clear_history(self) -> None:
        """Clear results history."""
        try:
            if os.path.exists(self.results_file):
                os.remove(self.results_file)
        except OSError as e:
            logger.error(f"Error clearing typing history: {e}")
            raise