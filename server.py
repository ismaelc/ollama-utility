from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import subprocess
import importlib
import argparse
import cgi
import os
import tempfile


class MyRequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin',
                         f'http://localhost:{args.web_server_port}')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path.startswith('/tool/'):
            result = None
            try:
                tool_name = parsed_path.path.split('/')[-1]
                tool_input = parsed_path.query.split(
                    '=')[1] if 'i=' in parsed_path.query else ''
                tool_input = tool_input.replace('%22', '')
                tool_input = tool_input.replace('%27', '')

                print(f"[QUERY]: {parsed_path.query}")
                print(f"[TOOL]: {tool_name}")
                print(f"[INPUT]: {tool_input}")

                tool_module = importlib.import_module(f'tools.{tool_name}')
                tool_function = getattr(tool_module, tool_name)
                result = tool_function(tool_input)

                print(f"[RESULT]: {result}")

                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(str(result).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        elif parsed_path.path == '/kill_ollama':
            try:
                command = "ps aux | grep 'ollama serve' | grep -v grep | awk '{print $2}' | xargs -r kill -9"
                subprocess.Popen(command, shell=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(
                    b"Process 'ollama serve' terminated successfully.")
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        elif parsed_path.path == '/start_ollama':
            try:
                subprocess.Popen(["ollama", "serve"])
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(
                    b"Process 'ollama serve' started successfully.")
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/upload':
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )

            fileitem = form['file']
            if fileitem.file:
                # It's an uploaded file; save it to a temp file
                filename = os.path.basename(fileitem.filename)
                temp_file = tempfile.NamedTemporaryFile(
                    delete=False, suffix=f'-{filename.replace(" ", "_")}')
                temp_file.write(fileitem.file.read())
                temp_file.close()

                # Send a 200 OK response
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin',
                                 f'http://localhost:{args.web_server_port}')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.end_headers()
                # Return the full file path to the client
                self.wfile.write(temp_file.name.encode())


# Create a parser
parser = argparse.ArgumentParser(description="HTTP Server")
parser.add_argument(
    'port', type=int, help='Listening port for the HTTP Server')
parser.add_argument(
    'web_server_port', type=int, help='Web server port')
args = parser.parse_args()

httpd = HTTPServer(('localhost', args.port), MyRequestHandler)
print(f"Serving utility functions on port {args.port}")
httpd.serve_forever()
