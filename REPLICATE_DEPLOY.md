# Replicate Deployment Guide

## Prerequisites
1. Install Cog: `curl -o /usr/local/bin/cog -L https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m) && chmod +x /usr/local/bin/cog`
2. Create Replicate account: https://replicate.com/
3. Get API token: https://replicate.com/account/api-tokens

## Deploy to Replicate

### 1. Test Locally (Optional)
```bash
# From project root
cog predict -i video=@path/to/test_video.mp4
```

### 2. Push to Replicate
```bash
# Login
cog login

# Push model (replace YOUR_USERNAME)
cog push r8.im/YOUR_USERNAME/soccer-analysis
```

### 3. Get Model URL
After pushing, you'll get a URL like:
`r8.im/YOUR_USERNAME/soccer-analysis`

### 4. Update server.js
Add your Replicate API token and model URL to `.env`:
```
REPLICATE_API_TOKEN=r8_your_token_here
REPLICATE_MODEL=YOUR_USERNAME/soccer-analysis
```

## Usage from Web App
Once deployed, your web app will automatically use the Replicate API when the environment variables are set.

## Cost Estimation
- GPU: NVIDIA T4 (~$0.0002/second)
- Average analysis time: 2-3 minutes
- Cost per analysis: ~$0.02-0.04
