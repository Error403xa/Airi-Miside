import http.server
import socketserver
import webbrowser
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # Add a couple of common Live2D file types
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".moc3": "application/octet-stream",
        ".model3.json": "application/json",
    }

if __name__ == "__main__":
    os.chdir(ROOT)
    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"Serving: {url}")
    try:
        webbrowser.open(url)
    except Exception:
        pass

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
