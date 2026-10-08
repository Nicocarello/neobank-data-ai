import http.server
import socketserver
import webbrowser
import os
import json
import urllib.parse
from copilot_engine import CopilotEngine

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.join(BASE_DIR, 'dashboard')
engine = CopilotEngine(os.path.join(BASE_DIR, 'neobank.db'))

class NeobankServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DASHBOARD_DIR, **kwargs)

    def _set_cors_headers(self, content_type="application/json"):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', content_type)

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            body = {}

        if parsed_url.path == '/api/chat':
            message = body.get('message', '').strip()
            api_key = body.get('apiKey', '').strip() or None
            provider = body.get('provider', 'internal').strip()

            if not message:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'El mensaje no puede estar vacío'}).encode('utf-8'))
                return

            try:
                result = engine.answer_question(message, api_key=api_key, provider=provider)
                self.send_response(200)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_url.path == '/api/sql':
            sql = body.get('sql', '').strip()
            if not sql:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'La consulta SQL es requerida'}).encode('utf-8'))
                return

            try:
                res = engine.execute_query(sql)
                chart = engine.infer_chart(res['columns'], res['rows'])
                res['chart'] = chart
                self.send_response(200)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def run_server():
    print(f"================================================================")
    print(f"  NEOBANK BI ANALYTICS & COPILOTO AUTÓNOMO TEXT-TO-SQL")
    print(f"================================================================")
    print(f"  Iniciando servidor local en: http://localhost:{PORT}")
    print(f"  Endpoints API:")
    print(f"    - POST http://localhost:{PORT}/api/chat (Lenguaje Natural a SQL)")
    print(f"    - POST http://localhost:{PORT}/api/sql  (Ejecución Directa Segura)")
    print(f"  Base de datos SQLite: neobank.db (Modo Read-Only)")
    print(f"================================================================")
    
    with socketserver.TCPServer(("", PORT), NeobankServerHandler) as httpd:
        print("Servidor activo. Presiona Ctrl+C para detener.")
        try:
            webbrowser.open(f"http://localhost:{PORT}/index.html")
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido con éxito.")

if __name__ == '__main__':
    run_server()
