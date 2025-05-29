from flask import Flask, render_template, request, Response,stream_with_context,jsonify
import requests
from urllib.parse import urljoin, unquote, quote_plus
from bs4 import BeautifulSoup
from flask_cors import CORS
app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}}) 
BASE_URL = "http://localhost:3000/anime/zoro"

@app.route("/api/new-snippet")
def new_snippet():
    # ?page=1, 2, 3 … (domyślnie 1)
    page = int(request.args.get("page", 1))

    try:
        # API twojego agregatora zwraca „ostatnio dodane” pod /recent-episodes
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
    # ?page=1, 2, 3 … (domyślnie 1)
    page = int(request.args.get("page", 1))

    try:
        # konsumet ma paginację top-airing?page=N
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

    # ⬇︎ JEDYNA ZMIANA – wstawiamy frazę bezpośrednio w ścieżkę
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

    for ep in info.get("episodes", []):
        # domyślnie globalny cover serialu
        thumb = info.get("image")
        try:
            # jedno wywołanie JSON zamiast scrapowania HTML
            w = requests.get(
                f"{BASE_URL}/watch?episodeId={ep['id']}", timeout=5
            ).json()
            # wybieramy klucz, który zawiera miniaturkę
            thumb = w.get("thumbnail") or w.get("poster") or thumb
        except Exception:
            pass
        ep["thumbnail"] = thumb

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
        print("Błąd top-airing:", e)
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
            print(f"Błąd podczas pobierania danych: {e}")
    return render_template('index.html', results=results, query=query)


@app.route("/proxy")
def proxy():
    raw_url = request.args.get("url")
    if not raw_url:
        return "Brak URL", 400

    url = unquote(raw_url)
    headers = {"Referer": "https://zoro.to"}

    try:
        r = requests.get(url, headers=headers, stream=True, timeout=15)
        if r.status_code != 200:
            return f"Błąd pobierania: {r.status_code}", 404

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
        print("❌ Błąd proxy:", e)
        return "Błąd proxy", 500

if __name__ == '__main__':
    app.run(debug=True)
