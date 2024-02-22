MODEL_NAME = mistral:7b-instruct-v0.2-q4_K_M
WEB_SERVER_PORT = 8000
PYTHON_SERVER_PORT = 8001

.PHONY: default check_ollama check_model download_resources web_server ollama_server python_server

# Default task that checks for ollama, checks for model, downloads the assets and starts the ollama, web, and Python servers
default: check_ollama check_python download_resources
	@$(MAKE) ollama_server check_model python_server web_server 

# Check if ollama is installed and update it
check_ollama:
	@if ! command -v ollama > /dev/null; then \
		echo "Installing ollama..."; \
		if [ `uname` = "Darwin" ]; then \
			brew install ollama; \
			brew upgrade ollama; \
		else \
			curl -fsSL https://ollama.com/install.sh | sh; \
		fi; \
	else \
		echo "Checking for ollama updates..."; \
		if [ `uname` = "Darwin" ]; then \
			brew upgrade ollama; \
		else \
			echo "Updating ollama on non-Darwin systems..."; \
			curl -fsSL https://ollama.com/install.sh | sh; \
		fi; \
	fi

# Check if model exists
check_model:
	# Check if model exists, if not pull it
	@if ! ollama list | grep -q "$(MODEL_NAME)"; then \
		ollama pull $(MODEL_NAME); \
	fi

# Check if Python is installed and install it if not
check_python:
	# Check if Python is installed and install it if not
	@if ! command -v python3 > /dev/null; then \
		echo "Python is not installed. Installing..."; \
		if [ `uname` = "Darwin" ]; then \
			brew install python3; \
		else \
			sudo apt-get update; \
			sudo apt-get install -y python3.8; \
		fi; \
	else \
		echo "Python is already installed."; \
	fi

# Web Server
web_server:
	# Kill process using port $(WEB_SERVER_PORT) if exists
	@echo "Checking for any process using port $(WEB_SERVER_PORT)..."
	@PID=$$(lsof -ti:$(WEB_SERVER_PORT)); if [ -n "$$PID" ]; then echo "Killing process $$PID using port $(WEB_SERVER_PORT)"; sudo kill $$PID; || echo "Could not kill process $$PID. Operation not permitted"; fi
	@echo "Starting web server on port $(WEB_SERVER_PORT)..."
	@python3 -m http.server $(WEB_SERVER_PORT) --bind 127.0.0.1

# Ollama Server
ollama_server:
	@echo "Checking if ollama serve is already running..."
	@PID=$$(pgrep -f "ollama serve"); if [ -n "$$PID" ]; then echo "Killing existing ollama server process $$PID"; sudo kill $$PID; || echo "Could not kill process $$PID. Operation not permitted"; fi
	@echo "Starting ollama server..."
	@export OLLAMA_ORIGINS=http://localhost:$(WEB_SERVER_PORT); ollama serve &

# Python Server
python_server:
	# Kill process using port $(PYTHON_SERVER_PORT) if exists
	@echo "Checking for any process using port $(PYTHON_SERVER_PORT)..."
	@PID=$$(lsof -ti:$(PYTHON_SERVER_PORT)); if [ -n "$$PID" ]; then echo "Killing process $$PID using port $(PYTHON_SERVER_PORT)"; kill $$PID; fi
	@echo "Starting Python server on port $(PYTHON_SERVER_PORT)..."
	@python server.py &

# Task to download resources
download_resources:
	# Check if resources directory exists, if not create it
	@if [ ! -d "resources" ]; then \
		mkdir -p ./resources/ && \
		cd ./resources/ && \
		curl -O https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css && \
		curl -O https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js && \
		curl -O https://cdn.jsdelivr.net/npm/marked@6.0.0/marked.min.js && \
		curl -O https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js; \
	fi
	# Check SHA-256 hash
	@shasum -a 256 -c resources.hash || exit 1

clean:
	@rm -rf ./resources
