from flask import Flask, render_template, request, Response, stream_with_context, jsonify
import requests
from urllib.parse import urljoin, unquote, quote_plus
from flask_cors import CORS
import json
import os
from datetime import datetime
import random

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}}) 
BASE_URL = "http://localhost:3000/anime/zoro"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True) #creates folder if it doesn't exist


@app.route("/api/new-snippet")
def new_snippet():
    page = int(request.args.get("page", 1))

    try:
        # API returns "recently added" under /recent-episodes
        r = requests.get(f"{BASE_URL}/recent-episodes?page={page}", timeout=10)
        items = r.json().get("results", []) if r.status_code == 200 else []
    except Exception as e:
        print("new-snippet error:", e)
        items = []

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

@app.route("/api/top-snippet")
def top_snippet():
    page = int(request.args.get("page", 1))
    try:
        # consumet has pagination top-airing?page=N
        r = requests.get(f"{BASE_URL}/top-airing?page={page}", timeout=10)
        items = r.json().get("results", []) if r.status_code == 200 else []
    except Exception as e:
        print("top-snippet error:", e)
        items = []

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

@app.route("/api/search-snippet")
def search_snippet():
    page = int(request.args.get("page", 1))
    q = request.args.get("q", "").strip()
    if not q:
        return Response("", mimetype="text/html")

    # Insert phrase directly in path
    upstream_url = f"{BASE_URL}/{quote_plus(q)}?page={page}"
    app.logger.debug(f"[search-snippet] GET {upstream_url}")

    try:
        r     = requests.get(upstream_url, timeout=10)
        data  = r.json()
        items = data.get("results", []) or data.get("data", []) or []
    except Exception as e:
        app.logger.error(f"[search-snippet] ERROR: {e}")
        items = []

    html = "".join(
        f'''
        <a href="/anime-list.html?id={a["id"]}" class="anime-list-card">
            <img src="{a["image"]}" class="anime-list-card-img" alt="{a["title"]}">
            <h2 class="anime-list-card-title">{a["title"]}</h2>
        </a>
        ''' for a in items
    )
    return Response(html, mimetype="text/html")

@app.route("/api/anime")
def anime_api():
    anime_id = request.args.get("id")
    if not anime_id:
        return {"error": "no id"}, 400

    r = requests.get(f"{BASE_URL}/info?id={anime_id}", timeout=10)
    if r.status_code != 200:
        return {"error": "upstream fail"}, r.status_code
    info = r.json()

    return jsonify(info)
    
@app.route("/api/watch")
def watch_api():
    ep_id = request.args.get("episodeId")
    if not ep_id:
        return {"error": "no episodeId"}, 400

    try:
        r = requests.get(f"{BASE_URL}/watch?episodeId={ep_id}", timeout=10)
        return r.json(), r.status_code
    except Exception as e:
        print("watch_api error:", e)
        return {"error": "upstream fail"}, 500

@app.route('/top')
def top_airing():
    try:
        r = requests.get(f"{BASE_URL}/top-airing")
        top_list = r.json().get("results", []) if r.status_code == 200 else []
    except Exception as e:
        print("Error top-airing:", e)
        top_list = []
    return render_template('top.html', top=top_list)

@app.route('/')
def index():
    query = request.args.get('q', '')
    results = []
    if query:
        try:
            response = requests.get(f"{BASE_URL}/{query}")
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
        except Exception as e:
            print(f"Error fetching data: {e}")
    return render_template('index.html', results=results, query=query)

@app.route("/proxy")
def proxy():
    raw_url = request.args.get("url")
    if not raw_url:
        return "No URL", 400

    url = unquote(raw_url)
    headers = {"Referer": "https://zoro.to"}

    try:
        r = requests.get(url, headers=headers, stream=True, timeout=15)
        if r.status_code != 200:
            return f"Fetch error: {r.status_code}", 404

        if url.lower().endswith(".m3u8"):
            playlist = r.text
            base = url.rsplit("/", 1)[0] + "/"

            def rewrite(line: str) -> str:
                line = line.strip()
                if not line or line.startswith("#"):
                    return line                         
                absolute = urljoin(base, line)
                return "/proxy?url=" + quote_plus(absolute)

            rewritten = "\n".join(rewrite(l) for l in playlist.splitlines())
            return Response(
                rewritten,
                mimetype="application/x-mpegURL"
            )
        
        def gen():
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        resp = Response(
            stream_with_context(gen()),
            content_type=r.headers.get("Content-Type", "video/mp2t"),
            direct_passthrough=True
        )
   
        for h in ("Content-Length", "Content-Range"):
            if h in r.headers:
                resp.headers[h] = r.headers[h]
        resp.headers["Access-Control-Allow-Origin"] = "*"
        return resp

    except Exception as e:
        print("❌ Proxy error:", e)
        return "Proxy error", 500

# ===============================================
# TYPING TEST API ENDPOINTS
# ===============================================

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

TYPING_RESULTS_FILE = os.path.join(DATA_DIR, 'typing_results.json')

def get_typing_results():
    """Load typing test results from file"""
    if not os.path.exists(TYPING_RESULTS_FILE):
        return []
    try:
        with open(TYPING_RESULTS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_typing_result(result):
    """Save typing test result to file"""
    results = get_typing_results()
    result['timestamp'] = datetime.now().isoformat()
    results.append(result)
    
    # Keep only last 1000 results
    if len(results) > 1000:
        results = results[-1000:]
    
    with open(TYPING_RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2)

@app.route("/api/typing/get-text")
def get_typing_text():
    """Get random text for typing test"""
    language = request.args.get('lang', 'en')
    texts = TYPING_TEXTS.get(language, TYPING_TEXTS['en'])
    text = random.choice(texts)
    return jsonify({'text': text})

@app.route("/api/typing/submit-result", methods=['POST'])
def submit_typing_result():
    """Submit typing test result"""
    data = request.json
    
    # Calculate statistics
    text = data['originalText']
    typed = data['typedText']
    time_seconds = data['time']
    
    # Words per minute
    words = len(text.split())
    wpm = round((words / time_seconds) * 60, 2) if time_seconds > 0 else 0
    
    # Characters per minute
    cpm = round((len(text) / time_seconds) * 60, 2) if time_seconds > 0 else 0
    
    # Accuracy
    correct_chars = sum(1 for i in range(min(len(text), len(typed))) 
                       if i < len(text) and i < len(typed) and text[i] == typed[i])
    accuracy = round((correct_chars / len(text)) * 100, 2) if text else 0
    
    # Errors
    errors = 0
    for i in range(max(len(text), len(typed))):
        if i >= len(text) or i >= len(typed) or text[i] != typed[i]:
            errors += 1
    
    result = {
        'wpm': wpm,
        'cpm': cpm,
        'accuracy': accuracy,
        'errors': errors,
        'time': time_seconds,
        'textLength': len(text)
    }
    
    save_typing_result(result)
    return jsonify(result)

@app.route("/api/typing/results")
def get_typing_results_api():
    """Get all typing test results"""
    results = get_typing_results()
    return jsonify(results)

@app.route("/api/typing/statistics")
def get_typing_statistics():
    """Get typing test statistics"""
    results = get_typing_results()
    
    if not results:
        return jsonify({
            'totalTests': 0,
            'averageWpm': 0,
            'averageCpm': 0,
            'averageAccuracy': 0,
            'bestWpm': 0,
            'bestAccuracy': 0
        })
    
    wpm_values = [r['wpm'] for r in results]
    cpm_values = [r['cpm'] for r in results]
    accuracy_values = [r['accuracy'] for r in results]
    
    return jsonify({
        'totalTests': len(results),
        'averageWpm': round(sum(wpm_values) / len(wpm_values), 2),
        'averageCpm': round(sum(cpm_values) / len(cpm_values), 2),
        'averageAccuracy': round(sum(accuracy_values) / len(accuracy_values), 2),
        'bestWpm': max(wpm_values),
        'bestAccuracy': max(accuracy_values)
    })

@app.route("/api/typing/clear-history", methods=['POST'])
def clear_typing_history():
    """Clear typing test history"""
    if os.path.exists(TYPING_RESULTS_FILE):
        os.remove(TYPING_RESULTS_FILE)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)