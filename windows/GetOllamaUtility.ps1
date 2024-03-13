# Set the repository owner, repository name, and desired branch/tag/commit
$owner = "ismaelc"
$repo = "ollama-utility"
$branch = "main"  # Replace with the desired branch, tag, or commit

# Save the current directory
$originalDirectory = Get-Location

# Set the download URL
$downloadUrl = "https://github.com/$owner/$repo/archive/$branch.zip"

# Set the local directory to save the downloaded ZIP file
$localDirectory = "ollama-utility"

# Create a temporary directory
$tempDirectory = Join-Path $localDirectory "temp"

# Create the local directory if it doesn't exist
if (-not (Test-Path $localDirectory)) {
    New-Item -ItemType Directory -Force -Path $localDirectory
}

# Create the temporary directory
New-Item -ItemType Directory -Force -Path $tempDirectory

# Set the local path for the downloaded ZIP file
$localZipFile = "$localDirectory\$repo.zip"

# Download the repository as a ZIP file
Invoke-WebRequest -Uri $downloadUrl -OutFile $localZipFile

# Unzip the contents to the temporary directory
Expand-Archive -Path $localZipFile -DestinationPath $tempDirectory -Force

# Get the directory that contains the extracted content
$extractedDirectory = Get-ChildItem -Path $tempDirectory | Where-Object { $_.PSIsContainer }

# Move the contents of the extracted directory to the local directory
Move-Item -Path "$($extractedDirectory.FullName)\*" -Destination $localDirectory -Force

# Remove the extracted directory
Remove-Item -Path $extractedDirectory.FullName -Force -Recurse

# Remove the downloaded ZIP file
Remove-Item -Path $localZipFile

Write-Host "Repository downloaded and extracted successfully."

# Return to the original directory
Set-Location $originalDirectory

Write-Host "Repository downloaded, extracted, and returned to original directory successfully."