"""
Video proxy module.
Handles proxy for video streaming and M3U8 playlists.
"""

import requests
from flask import Blueprint, request, Response, stream_with_context
from urllib.parse import urljoin, unquote, quote_plus
import logging

# Import from parent directory when running from monorepo root
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from utils.error_handlers import handle_errors

logger = logging.getLogger(__name__)

# Create blueprint
proxy_bp = Blueprint('proxy', __name__)


@proxy_bp.route("/proxy")
@handle_errors("Proxy error", 500)
def proxy():
    """
    Proxy for video file streaming.
    Handles M3U8 playlists and video segments.
    
    Query params:
        url (str): URL to proxy
        
    Returns:
        Response: Video stream or playlist
    """
    raw_url = request.args.get("url")
    if not raw_url:
        return "Missing URL parameter", 400
    
    url = unquote(raw_url)
    headers = {"Referer": Config.PROXY_DEFAULT_REFERER}
    
    try:
        # Fetch resource from source
        response = requests.get(
            url, 
            headers=headers, 
            stream=True, 
            timeout=Config.PROXY_TIMEOUT
        )
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Proxy request error: {e}")
        return f"Fetch error: {str(e)}", 500
    
    # Handle M3U8 playlists
    if url.lower().endswith(".m3u8"):
        return _handle_m3u8_playlist(url, response)
    
    # Handle other files (video segments)
    return _handle_video_stream(response)


def _handle_m3u8_playlist(url: str, response: requests.Response) -> Response:
    """
    Handle and modify M3U8 playlists.
    
    Args:
        url: Playlist URL
        response: Response with playlist
        
    Returns:
        Response: Modified playlist
    """
    playlist = response.text
    base_url = url.rsplit("/", 1)[0] + "/"
    
    def rewrite_line(line: str) -> str:
        """Rewrite URLs in playlist line."""
        line = line.strip()
        if not line or line.startswith("#"):
            return line
        # Convert relative URLs to absolute and add proxy
        absolute_url = urljoin(base_url, line)
        return "/proxy?url=" + quote_plus(absolute_url)
    
    # Rewrite all URLs in playlist
    rewritten_playlist = "\n".join(
        rewrite_line(line) for line in playlist.splitlines()
    )
    
    return Response(
        rewritten_playlist,
        mimetype="application/x-mpegURL",
        headers={"Access-Control-Allow-Origin": "*"}
    )


def _handle_video_stream(response: requests.Response) -> Response:
    """
    Handle video stream.
    
    Args:
        response: Response with stream
        
    Returns:
        Response: Video stream
    """
    def stream_generator():
        """Stream generator."""
        try:
            for chunk in response.iter_content(chunk_size=Config.PROXY_CHUNK_SIZE):
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"Stream error: {e}")
    
    # Prepare response with stream
    resp = Response(
        stream_with_context(stream_generator()),
        content_type=response.headers.get("Content-Type", "video/mp2t"),
        direct_passthrough=True
    )
    
    # Pass important headers
    for header in ("Content-Length", "Content-Range"):
        if header in response.headers:
            resp.headers[header] = response.headers[header]
    
    resp.headers["Access-Control-Allow-Origin"] = "*"
    
    return resp