import http.server
import socketserver
import subprocess

PORT = 8001

class MyRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self._send_cors_headers()
        super().end_headers()

    def _send_cors_headers(self):
        """Sends CORS headers to the client."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")

    def do_GET(self):
        self._send_cors_headers()  # Send CORS headers for GET requests
        if self.path == "/kill_ollama":
            try:
                # Use grep to find "ollama serve" processes, awk to extract PIDs, and xargs to kill them
                command = "ps aux | grep 'ollama serve' | grep -v grep | awk '{print $2}' | xargs -r kill -9"
                subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.send_response(200)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(b"Process 'ollama serve' terminated successfully.")
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        elif self.path == "/start_ollama":
            try:
                subprocess.Popen(["ollama", "serve"])
                self.send_response(200)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(b"Process 'ollama serve' started successfully.")
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)  # OK status
        self._send_cors_headers()
        self.end_headers()

with socketserver.TCPServer(("", PORT), MyRequestHandler) as httpd:
    print(f"Serving on port {PORT}")
    httpd.serve_forever()
