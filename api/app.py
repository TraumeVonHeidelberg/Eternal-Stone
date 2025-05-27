from flask import Flask, render_template, request, Response
import requests
from urllib.parse import urljoin, unquote

app = Flask(__name__)
BASE_URL = "http://localhost:3000/anime/zoro"

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

@app.route('/anime/<anime_id>')
def anime(anime_id):
    try:
        response = requests.get(f"{BASE_URL}/info?id={anime_id}")
        if response.status_code == 200:
            anime_data = response.json()
            return render_template('episodes.html', anime=anime_data)
    except Exception as e:
        print(f"Błąd podczas pobierania danych o anime: {e}")
    return "Anime not found or API error", 404

@app.route('/watch/<episode_id>')
def watch(episode_id):
    try:
        response = requests.get(f"{BASE_URL}/watch?episodeId={episode_id}")
        if response.status_code == 200:
            data = response.json()
            sources = data.get('sources', [])
            subtitles = data.get('subtitles', [])
            video_url = None
            for source in sources:
                if source.get('quality') == 'default':
                    video_url = source['url']
                    break
            if not video_url and sources:
                video_url = sources[0]['url']
            print("▶️ Finalny link do odtwarzania:", video_url)
            return render_template('player.html', video_url="/proxy?url=" + video_url, subtitles=subtitles)
    except Exception as e:
        print(f"Błąd podczas pobierania odcinka: {e}")
    return "Odcinek niedostępny lub API error", 404

@app.route('/proxy')
def proxy():
    raw_url = request.args.get('url')
    if not raw_url:
        return "Brak URL", 400
    url = unquote(raw_url)
    headers = {"Referer": "https://zoro.to"}
    print(f"🔁 Proxy żąda: {url}")
    try:
        r = requests.get(url, headers=headers, stream=True)
        if r.status_code != 200:
            print(f"❌ Błąd HTTP {r.status_code} przy pobieraniu: {url}")
            return f"Błąd pobierania: {r.status_code}", 404
        if ".m3u8" in url:
            playlist = r.text
            base_url = url.rsplit("/", 1)[0] + "/"
            rewritten = []
            for line in playlist.splitlines():
                if line.strip().endswith(".ts") or line.strip().endswith(".m3u8"):
                    proxied_line = "/proxy?url=" + urljoin(base_url, line.strip())
                    rewritten.append(proxied_line)
                else:
                    rewritten.append(line)
            return Response("\n".join(rewritten), content_type='application/vnd.apple.mpegurl')
        return Response(r.raw, content_type=r.headers.get('content-type'))
    except Exception as e:
        print(f"❌ Błąd proxy: {e}")
        return "Błąd proxy", 500

if __name__ == '__main__':
    app.run(debug=True)
