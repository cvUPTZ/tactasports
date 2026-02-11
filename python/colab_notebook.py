# ==========================================
# GOOGLE COLAB NOTEBOOK SCRIPT
# Copy and paste this entire script into a code cell in Google Colab.
# ==========================================

# 1. Check GPU
import subprocess
import os

print("🔍 Checking GPU...")
gpu_info = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
if gpu_info.returncode == 0:
    print("✅ GPU Available!")
    print(gpu_info.stdout)
else:
    print("⚠️  No GPU detected. Go to Runtime -> Change runtime type -> GPU")

# 2. Clone or Upload Code
print("\n📦 Setting up code...")

# Option A: Upload the zip file manually
# Click the folder icon on the left, then upload python_kaggle.zip
# Then uncomment these lines:
# !unzip -o python_kaggle.zip
# %cd python

# Option B: Clone from GitHub (if you have a public repo)
# !git clone https://github.com/your-username/your-repo.git
# %cd your-repo/python

# For now, we'll assume you uploaded python_kaggle.zip
if os.path.exists('python_kaggle.zip'):
    print("Found python_kaggle.zip, extracting...")
    !unzip -qo python_kaggle.zip
    %cd python
elif os.path.exists('/content/python_kaggle.zip'):
    print("Found python_kaggle.zip in /content, extracting...")
    !unzip -qo /content/python_kaggle.zip
    %cd python
else:
    print("⚠️  Please upload python_kaggle.zip to Colab")
    print("   1. Click the folder icon on the left sidebar")
    print("   2. Click the upload button")
    print("   3. Select python_kaggle.zip")
    print("   4. Run this cell again")
    raise Exception("Code not found")

# 3. Install System Dependencies
print("\n📦 Installing system dependencies...")
!apt-get update -qq
!apt-get install -y -qq libgl1 libglib2.0-0

# 4. Install Python Dependencies
print("\n📦 Installing Python libraries...")
!pip install -q 'numpy<2.0.0' -r requirements.txt
!pip install -q pyngrok

# 5. Setup Ngrok
print("\n🔐 Setting up Ngrok...")
from pyngrok import ngrok, conf

# Get authtoken
print("="*60)
print("NGROK SETUP")
print("1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken")
print("2. Copy your authtoken")
print("="*60)

from getpass import getpass
authtoken = getpass("Paste your Ngrok authtoken here: ")
ngrok.set_auth_token(authtoken)

# 6. Start Server in Background
print("\n🚀 Starting server...")

# Create a startup script
with open('start_server.sh', 'w') as f:
    f.write('#!/bin/bash\n')
    f.write('python api.py\n')

!chmod +x start_server.sh

# Start server in background
import threading
import time

def run_server():
    os.system('./start_server.sh')

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Wait for server to start
print("Waiting for server to start...")
time.sleep(5)

# 7. Create Ngrok Tunnel
public_url = ngrok.connect(8000, bind_tls=True)
print("\n" + "="*60)
print(f"✅ PUBLIC URL: {public_url}")
print("="*60)
print("\nCopy this URL and paste it into your app's 'Remote Server URL' setting.")
print("\nThe server is now running! Keep this notebook open.")
print("To stop: Runtime -> Interrupt execution")

# Keep the cell running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Server stopped")
    ngrok.disconnect(public_url)
