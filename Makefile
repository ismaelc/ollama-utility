MODEL_NAME = mistral:7b-instruct-v0.2-q4_K_M

.PHONY: default check_ollama check_model download_resources web_server ollama_server

# Default task that checks for ollama, checks for model, downloads the assets and starts the ollama and web server
default: check_ollama check_model download_resources
	@$(MAKE) -j 2 web_server ollama_server

# Check if ollama is installed
check_ollama:
	# Check if ollama is installed, if not install it
	@if ! command -v ollama > /dev/null; then \
		curl -fsSL https://ollama.com/install.sh | sh; \
	fi

# Check if model exists
check_model:
	# Check if model exists, if not pull it
	@if ! ollama list | grep -q "$(MODEL_NAME)"; then \
		ollama pull $(MODEL_NAME); \
	fi

# Web Server
web_server:
	python3 -m http.server --bind 127.0.0.1

# Ollama Server
ollama_server:
	# Check if ollama serve is already running, if not start it
	@if ! pgrep -f "ollama serve" > /dev/null; then \
		ollama serve; \
	fi

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