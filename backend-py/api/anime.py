"""
Anime API module.
Contains endpoints for anime browsing and searching functionality.
"""

from flask import Blueprint, request, Response, jsonify
import logging

# Import from parent directory when running from monorepo root
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.anime_service import AnimeService
from utils.error_handlers import handle_errors
from utils.validators import validate_page_number, validate_anime_id, ValidationError

logger = logging.getLogger(__name__)

# Create blueprint
anime_bp = Blueprint('anime', __name__, url_prefix='/api')

# Initialize service
anime_service = AnimeService()


@anime_bp.route("/new-snippet")
@handle_errors("Error fetching new anime")
def new_snippet():
    """
    Get HTML snippet with recently added anime.
    
    Query params:
        page (int): Page number (default 1)
        
    Returns:
        Response: HTML snippet with anime list
    """
    try:
        page = validate_page_number(request.args.get("page", 1))
    except ValidationError:
        page = 1
    
    items = anime_service.get_recent_episodes(page)
    
    html = "".join(
        f'''
        <a href="/anime-list.html?id={a["id"]}" class="anime-list-card">
            <img src="{a["image"]}" class="anime-list-card-img" alt="{a["title"]}">
            <h2 class="anime-list-card-title">{a["title"]}</h2>
        </a>
        '''
        for a in items
    )
    return Response(html, mimetype="text/html")


@anime_bp.route("/top-snippet")
@handle_errors("Error fetching top anime")
def top_snippet():
    """
    Get HTML snippet with top airing anime.
    
    Query params:
        page (int): Page number (default 1)
        
    Returns:
        Response: HTML snippet with anime list
    """
    try:
        page = validate_page_number(request.args.get("page", 1))
    except ValidationError:
        page = 1
    
    items = anime_service.get_top_airing(page)
    
    html = "".join(
        f'''
        <a href="/anime-list.html?id={a["id"]}" class="anime-list-card">
            <img src="{a["image"]}" class="anime-list-card-img" alt="{a["title"]}">
            <h2 class="anime-list-card-title">{a["title"]}</h2>
        </a>
        '''
        for a in items
    )
    return Response(html, mimetype="text/html")


@anime_bp.route("/search-snippet")
@handle_errors("Error searching anime")
def search_snippet():
    """
    Search anime and return HTML snippet.
    
    Query params:
        q (str): Search query
        page (int): Page number (default 1)
        
    Returns:
        Response: HTML snippet with search results
    """
    query = request.args.get("q", "").strip()
    if not query:
        return Response("", mimetype="text/html")
    
    try:
        page = validate_page_number(request.args.get("page", 1))
    except ValidationError:
        page = 1
    
    items = anime_service.search_anime(query, page)
    
    html = "".join(
        f'''
        <a href="/anime-list.html?id={a["id"]}" class="anime-list-card">
            <img src="{a["image"]}" class="anime-list-card-img" alt="{a["title"]}">
            <h2 class="anime-list-card-title">{a["title"]}</h2>
        </a>
        '''
        for a in items
    )
    return Response(html, mimetype="text/html")


@anime_bp.route("/anime")
@handle_errors("Error fetching anime info")
def anime_api():
    """
    Get detailed anime information.
    
    Query params:
        id (str): Anime ID
        
    Returns:
        JSON: Anime information
    """
    try:
        anime_id = validate_anime_id(request.args.get("id"))
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    
    info = anime_service.get_anime_info(anime_id)
    if info is None:
        return jsonify({"error": "Anime not found"}), 404
    
    return jsonify(info)


@anime_bp.route("/watch")
@handle_errors("Error fetching watch sources")
def watch_api():
    """
    Get watch sources for episode.
    
    Query params:
        episodeId (str): Episode ID
        
    Returns:
        JSON: Watch sources
    """
    episode_id = request.args.get("episodeId")
    if not episode_id:
        return jsonify({"error": "Missing 'episodeId' parameter"}), 400
    
    sources = anime_service.get_watch_sources(episode_id)
    if sources is None:
        return jsonify({"error": "Sources not found"}), 404
    
    return jsonify(sources)