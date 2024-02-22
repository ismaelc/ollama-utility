$ModelName = "mistral:7b-instruct-v0.2-q4_K_M"
$PortWeb = 8000
$PortPython = 8001

# Default task that checks for ollama, checks for model, downloads the assets, and starts the ollama and web server
function Default-Task {
    if (-not (Check-Ollama)) {
        Write-Host "Ollama is not installed. Aborting."
        return
    }
    

    if (-not (Check-Python)) {
        Write-Host "Python is not installed. Aborting."
        return
    }

    Download-Resources
    Start-OllamaServer
    Check-Model
    Start-PythonServer
    Start-WebServer
}

# Check if ollama is installed
function Check-Ollama {
    # Check if ollama is installed
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        return $false
    }
    return $true
}

# Check if Python is installed
function Check-Python {
    if (-not (Get-Command python3 -ErrorAction SilentlyContinue)) {
        return $false
    } else {
        return $true
    }
}

# Task to download resources
function Download-Resources {
    $resourcesDir = ".\ollama-utility\resources"
    # Check if resources directory exists, if not create it
    if (-not (Test-Path $resourcesDir -PathType Container)) {
        Write-Host "Creating resources directory..."
        New-Item -ItemType Directory -Path $resourcesDir | Out-Null
        Set-Location $resourcesDir

        Write-Host "Downloading resources..."
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" -OutFile "bootstrap.min.css"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js" -OutFile "bootstrap.bundle.min.js"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/marked@6.0.0/marked.min.js" -OutFile "marked.min.js"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js" -OutFile "purify.min.js"
    }

    # Check SHA-256 hash
    # Write-Host "Checking SHA-256 hash..."
    # Your SHA-256 checking code goes here
}

# Start Ollama Server
function Start-OllamaServer {
    # Check if ollama serve is already running, if not start it
    $ollamaProcess = Get-Process | Where-Object {$_.ProcessName -eq "ollama"}
    if (-not $ollamaProcess) {
        Write-Host "Starting Ollama Server..."
        $env:OLLAMA_ORIGINS = "http://localhost:8000"
        Start-Process ollama -ArgumentList "serve"
    }
}

# Check if model exists
function Check-Model {
    # Check if model exists
    $modelExists = (ollama list) -match $ModelName
    if (-not $modelExists) {
        Write-Host "Model $ModelName not found. Pulling..."
        ollama pull $ModelName
    }
}

# Start Python Server
function Start-PythonServer {
    Get-NetTCPConnection | Where-Object { $_.LocalPort -eq $PortPython } | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
    Write-Host "Starting Python Server..."
    Start-Process python3 -ArgumentList "server.py"
}

# Start Web Server
function Start-WebServer {
    Get-NetTCPConnection | Where-Object { $_.LocalPort -eq $PortWeb } | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
    Write-Host "Starting Web Server..."
    $ollamaUtilityDir = Join-Path $env:USERPROFILE "ollama-utility"
    if (-not (Test-Path $ollamaUtilityDir -PathType Container)) {
        Write-Host "Ollama utility directory not found. Exiting."
        return
    }
    Set-Location $ollamaUtilityDir
    python -m http.server $PortWeb --bind 127.0.0.1
}

# Main entry point
Default-Task