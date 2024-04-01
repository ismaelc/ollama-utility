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
    if (-not (Test-Path $resourcesDir -PathType Container)) {
        Write-Host "Creating resources directory..."
        New-Item -ItemType Directory -Path $resourcesDir | Out-Null
        Push-Location
        Set-Location $resourcesDir

        Write-Host "Downloading resources..."
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" -OutFile "bootstrap.min.css"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js" -OutFile "bootstrap.bundle.min.js"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/marked@6.0.0/marked.min.js" -OutFile "marked.min.js"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff" -OutFile "fonts/bootstrap-icons.woff"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2" -OutFile "fonts/bootstrap-icons.woff2"
        Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" -OutFile "bootstrap-icons.css"
        Pop-Location
    }
}

# Start Ollama Server
function Start-OllamaServer {
    $ollamaProcess = Get-Process | Where-Object {$_.ProcessName -eq "ollama"}
    if (-not $ollamaProcess) {
        Write-Host "Starting Ollama Server..."
        $env:OLLAMA_ORIGINS = "http://localhost:8000"
        Start-Process ollama -ArgumentList "serve"
    }
}

# Check if model exists
function Check-Model {
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
    $ollamaUtilityDir = "ollama-utility"
    if (-not (Test-Path $ollamaUtilityDir -PathType Container)) {
        Write-Host "Ollama utility directory not found. Exiting."
        return
    }
    Push-Location
    Set-Location $ollamaUtilityDir
    python -m http.server $PortWeb --bind 127.0.0.1
    Pop-Location
}

Default-Task