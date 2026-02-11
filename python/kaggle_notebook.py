# ==========================================
# KAGGLE NOTEBOOK SCRIPT
# Copy and paste this entire script into a code cell in a Kaggle Notebook.
# ==========================================

# 1. Setup Environment
import os
import subprocess
import sys
import time

def run_command(command):
    print(f"Running: {command}")
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"Error: {stderr.decode()}")
        raise Exception(f"Command failed: {command}")
    print(stdout.decode())

print("🚀 Setting up Soccer Analysis Environment...")

# 2. Clone Repository (or download code)
# NOTE: In a real scenario, you might want to clone your specific repo.
# For now, we assume the user might upload the 'python' folder as a dataset or we clone the main repo.
# Replace this URL with your actual repo if needed, or upload the code manually.
# 2. Find and Setup Code
print("🔍 Searching for code...")

def setup_workspace():
    # Case 1: Zip file exists in input (User uploaded zip as dataset)
    for root, dirs, files in os.walk("/kaggle/input"):
        for file in files:
            if file.endswith(".zip") and "python" in file:
                zip_path = os.path.join(root, file)
                print(f"Found zip: {zip_path}")
                run_command(f"cp '{zip_path}' .")
                run_command(f"unzip -o '{file}'")
                return True

    # Case 2: Files are already unzipped in input (Kaggle auto-unzipped)
    for root, dirs, files in os.walk("/kaggle/input"):
        if "requirements.txt" in files:
            print(f"Found source code in: {root}")
            # Copy everything to working directory
            if "python" in root:
                # If we found .../python/requirements.txt, copy the parent folder content
                src = os.path.dirname(root)
                run_command(f"cp -r '{src}/.' .")
            else:
                # If we found .../requirements.txt (root), copy that folder
                run_command(f"cp -r '{root}/.' .")
            return True
            
    return False

if not setup_workspace():
    print("⚠️ Could not automatically find code. Checking current directory...")

# 3. Install System Dependencies
print("Installing system dependencies...")
run_command("apt-get update && apt-get install -y libgl1 libglib2.0-0")

# 4. Install Python Dependencies
print("Installing Python libraries...")
if os.path.exists("python"):
    os.chdir("python")
elif os.path.exists("requirements.txt"):
    pass # Already in the right folder
else:
    print("❌ Error: Could not find 'python' folder or 'requirements.txt'")
    print("Current directory content:", os.listdir("."))
    raise Exception("Setup failed: Code not found")

run_command("pip install 'numpy<2.0.0' -r requirements.txt")
run_command("pip install pyngrok nest_asyncio")

# 5. Setup Ngrok
from pyngrok import ngrok
import nest_asyncio

# Get Ngrok Token from user
print("\n" + "="*50)
print("NGROK SETUP")
print("1. Go to https://dashboard.ngrok.com/get-started/your-authtoken")
print("2. Copy your Authtoken")
print("="*50 + "\n")

# You can hardcode your token here if you want, or paste it when running
NGROK_TOKEN = input("Enter your Ngrok Authtoken: ")
ngrok.set_auth_token(NGROK_TOKEN)

# 6. Start Server
print("\n🚀 Starting Server...")

# Apply nest_asyncio to allow nested event loops (needed for uvicorn in notebook)
nest_asyncio.apply()

# Start ngrok tunnel
public_url = ngrok.connect(8000).public_url
print("\n" + "="*50)
print(f"✅ PUBLIC URL: {public_url}")
print("Copy this URL into your Video Player 'Remote Server URL' settings.")
print("="*50 + "\n")

# Run Uvicorn
import uvicorn
from api import app

# Run the server
uvicorn.run(app, host="0.0.0.0", port=8000)
