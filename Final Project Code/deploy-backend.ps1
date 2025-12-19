# -----------------------------
# Smart Deployment Script (Pathless Version)
# -----------------------------

# Detect script root
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1) Backend folder auto-detect
$BackendFolder = Join-Path $ScriptRoot "backend"
$WarFile = Join-Path $BackendFolder "target\backend.war"

# 2) Auto-detect Tomcat anywhere under user profile
Write-Host "Searching for Tomcat installation..."
$TomcatRoot = Get-ChildItem -Path $env:USERPROFILE -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path "$($_.FullName)\bin\startup.bat" } |
    Select-Object -First 1

if (-not $TomcatRoot) {
    Write-Host "Tomcat installation not found under your user profile."
    exit
}

$TomcatRoot = $TomcatRoot.FullName
$TomcatBin = Join-Path $TomcatRoot "bin"
$TomcatWebapps = Join-Path $TomcatRoot "webapps"
$TomcatWork = Join-Path $TomcatRoot "work\Catalina\localhost"

Write-Host "Detected Tomcat root: $TomcatRoot"

# 3) Stop Tomcat
Write-Host "Stopping Tomcat..."
cd $TomcatBin
.\shutdown.bat
Start-Sleep -Seconds 5

# 4) Clean old deployment
Write-Host "Cleaning old backend deployment..."
Remove-Item "$TomcatWebapps\backend" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$TomcatWork\backend" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$TomcatWebapps\backend.war" -Force -ErrorAction SilentlyContinue

# 5) Build WAR
Write-Host "Building backend WAR..."
cd $BackendFolder
mvn clean package

if (-not (Test-Path $WarFile)) {
    Write-Host "WAR file not found! Build failed."
    exit
}

# 6) Deploy WAR
Write-Host "Deploying WAR..."
Copy-Item $WarFile "$TomcatWebapps\backend.war" -Force

# 7) Start Tomcat
Write-Host "Starting Tomcat..."
cd $TomcatBin
.\startup.bat

# 8) Wait for deployment
Write-Host "Waiting for backend deployment..."
$maxWait = 60
$waited = 0
while (-not (Test-Path "$TomcatWebapps\backend") -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
}

Write-Host "Deployment complete."

# 9) Run startup.sh automatically
$StartupScript = Join-Path $ScriptRoot "startup.sh"
if (Test-Path $StartupScript) {
    Write-Host "Running startup.sh..."
    bash $StartupScript
} else {
    Write-Host "startup.sh not found in project root."
}
