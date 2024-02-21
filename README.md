# ollama-utility
Forked from [ollama-ui](https://github.com/ollama-ui/ollama-ui).

A simple HTML UI for Ollama.

| Chat | Notepad |
| ---- | ------- |
| ![Chat](images/ollama-utility-01.png) | ![Notepad](images/ollama-utility-02.png) |

## Setup

### Mac/Linux

```bash
git clone https://github.com/ismaelc/ollama-utility
cd ollama-utility
make
(open http://localhost:8000) # Open in browser
```

### Windows

Open PowerShell as Administrator and run:

```powershell
# Download and run GetOllamaUtility.ps1
Invoke-WebRequest "https://raw.githubusercontent.com/ismaelc/ollama-utility/main/windows/GetOllamaUtility.ps1" -OutFile "GetOllamaUtility.ps1"
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
.\GetOllamaUtility.ps1

# Download and run RunOllamaUtility.ps1
Invoke-WebRequest "https://raw.githubusercontent.com/ismaelc/ollama-utility/main/windows/RunOllamaUtility.ps1" -OutFile "RunOllamaUtility.ps1"
.\RunOllamaUtility.ps1

#Open in browser
(Open `http://localhost:8000` in browser)
```

## Maintenance Commands

Update to latest version:

```bash
git pull origin main
```

Terminate running ollama service:

```bash
pkill -f "ollama serve"
```

Free up port 8000:

```bash
lsof -ti:8000 | xargs kill
```