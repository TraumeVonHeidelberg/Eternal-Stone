"""
API package.
Contains all API endpoint blueprints.
"""

from .anime import anime_bp
from .typing import typing_bp
from .proxy import proxy_bp

__all__ = ['anime_bp', 'typing_bp', 'proxy_bp']