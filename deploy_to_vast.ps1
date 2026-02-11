param(
    [Parameter(Mandatory=$true)]
    [string]$KeyPath
)

# Configuration pour le proxy SSH Vast.ai

# Configuration (Mode Direct Connection)
$User = "root"
$HostIP = "86.127.244.250"   # L'adresse IP directe (plus de problème DNS)
$Port = "21521"              # ATTENTION : Le port a changé (c'est celui du Direct Connect)
Write-Host "=== Deploying to Vast.ai Instance via Proxy SSH (${HostIP}:${Port}) ==="

# 1. Upload Python scripts
Write-Host "[1/3] Uploading Python scripts..."
scp -P $Port -i "$KeyPath" -o StrictHostKeyChecking=no -r ./python "$User@${HostIP}:/root/"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed. Check your key path and connection."
    exit
}

# 2. Install Dependencies
Write-Host "[2/3] Installing dependencies on remote server..."
# On essaie d'abord d'installer pip si nécessaire, puis les librairies
ssh -p $Port -i "$KeyPath" -o StrictHostKeyChecking=no "$User@${HostIP}" "apt-get update && apt-get install -y python3-pip && pip3 install fastapi uvicorn ultralytics opencv-python-headless python-multipart"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Dependency installation failed."
    exit
}

# 3. Instructions
Write-Host "[3/3] Setup Complete!"
Write-Host "---------------------------------------------------"
Write-Host "To start the server and connect, run the following command in a NEW terminal window:"
Write-Host ""
Write-Host "ssh -p $Port -i `"$KeyPath`" -L 8080:localhost:8080 $User@${HostIP} 'python3 /root/python/remote_server.py'"
Write-Host ""
Write-Host "---------------------------------------------------"