# RunPod Deployment Guide

This guide will help you deploy the soccer analysis backend to your RunPod GPU instance.

## Prerequisites
- A RunPod account with credits (which you have!)
- The local project files

## Step 1: Launch a Pod
1. Go to [RunPod Console](https://www.runpod.io/console/pods)
2. Click **Deploy** (or "Launch a GPU environment")
3. Select a GPU (e.g., RTX 3090 or 4090 are great for this)
4. Choose a Template: **RunPod PyTorch 2.1** (or similar)
   - *Note: Ensure it has Python 3.10+*
5. Click **Continue** -> **Deploy**

## Step 2: Prepare Your Code
We need to upload the `python` folder to the Pod.

1. On your local machine, zip the `python` folder inside `soccer-controller-log-main`.
   - You should have a file named `python.zip` containing `analyze_match.py`, `api.py`, etc.

## Step 3: Connect and Upload
1. Once your Pod is **Running**, click the **Connect** button.
2. Click **Start Web Terminal** (or use SSH if you prefer).
3. In the terminal, create a directory:
   ```bash
   mkdir soccer-analysis
   cd soccer-analysis
   ```
4. **Upload the Code**:
   - In the Web Terminal UI, look for an "Upload" button (usually top right or via Jupyter Lab).
   - Upload your `python.zip`.
   - Unzip it:
     ```bash
     unzip python.zip
     cd python
     ```

## Step 4: Install Dependencies
Run the following command in the terminal (inside the `python` folder):

```bash
pip install -r requirements.txt
```

*Note: If you get an error about `cv2` (OpenCV), run:*
```bash
apt-get update && apt-get install -y libgl1
```

## Step 5: Start the Server
Run the API server:

```bash
python api.py
```

You should see: `Uvicorn running on http://0.0.0.0:8000`

## Step 6: Expose the Port
1. Go back to the **RunPod Console** -> **My Pods**.
2. Click the **Connect** button on your pod.
3. Look for **TCP Port Mappings**.
4. Find the public IP and port mapping for internal port **8000**.
   - It will look like: `123.45.67.89:12345` -> `8000`
   - Or if using the Proxy feature: `https://<pod-id>-8000.proxy.runpod.net`

## Step 7: Connect Web App
1. Open your local web app (`http://localhost:5173`).
2. Go to the **Video Player**.
3. Click the **Settings** (gear icon).
4. In **Vast.ai / Remote Server URL**, enter the URL from Step 6.
   - Example: `http://123.45.67.89:12345` or `https://<pod-id>-8000.proxy.runpod.net`
   - *Do not include a trailing slash.*
5. Upload a video and click **Run Analysis**.

🚀 The analysis will now run on the powerful RunPod GPU!
