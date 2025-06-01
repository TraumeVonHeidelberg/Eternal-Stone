"""
Anime service module.
Contains business logic for anime-related operations.
"""

import requests
from typing import List, Dict, Any, Optional
from urllib.parse import quote_plus
import logging

# Import from parent directory when running from monorepo root
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

logger = logging.getLogger(__name__)


class AnimeService:
    """Service class for anime operations."""
    
    def __init__(self, base_url: str = Config.BASE_API_URL, timeout: int = Config.REQUEST_TIMEOUT):
        """
        Initialize anime service.
        
        Args:
            base_url: Base API URL
            timeout: HTTP request timeout
        """
        self.base_url = base_url
        self.timeout = timeout
    
    def get_recent_episodes(self, page: int = 1) -> List[Dict[str, Any]]:
        """
        Get recently added episodes.
        
        Args:
            page: Page number
            
        Returns:
            list: List of episodes
        """
        try:
            response = requests.get(
                f"{self.base_url}/recent-episodes",
                params={"page": page},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except requests.RequestException as e:
            logger.error(f"Error fetching recent episodes: {e}")
            return []
    
    def get_top_airing(self, page: int = 1) -> List[Dict[str, Any]]:
        """
        Get top airing anime.
        
        Args:
            page: Page number
            
        Returns:
            list: List of anime
        """
        try:
            response = requests.get(
                f"{self.base_url}/top-airing",
                params={"page": page},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except requests.RequestException as e:
            logger.error(f"Error fetching top airing: {e}")
            return []
    
    def search_anime(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        """
        Search for anime.
        
        Args:
            query: Search query
            page: Page number
            
        Returns:
            list: Search results
        """
        if not query:
            return []
        
        try:
            url = f"{self.base_url}/{quote_plus(query)}"
            response = requests.get(
                url,
                params={"page": page},
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", []) or data.get("data", [])
        except requests.RequestException as e:
            logger.error(f"Error searching anime: {e}")
            return []
    
    def get_anime_info(self, anime_id: str) -> Optional[Dict[str, Any]]:
        """
        Get anime information.
        
        Args:
            anime_id: Anime ID
            
        Returns:
            dict: Anime information or None
        """
        try:
            response = requests.get(
                f"{self.base_url}/info",
                params={"id": anime_id},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error fetching anime info: {e}")
            return None
    
    def get_watch_sources(self, episode_id: str) -> Optional[Dict[str, Any]]:
        """
        Get episode watch sources.
        
        Args:
            episode_id: Episode ID
            
        Returns:
            dict: Watch sources or None
        """
        try:
            response = requests.get(
                f"{self.base_url}/watch",
                params={"episodeId": episode_id},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error fetching watch sources: {e}")
            return None