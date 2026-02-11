# Quick Start Guide - Replicate Integration

## Current Status
Your web app is working with local Python execution. To use GPU acceleration via Replicate:

### Option 1: Deploy to Replicate (Recommended for Production)
1. Install Cog: https://github.com/replicate/cog#install
2. Run: `cog push r8.im/YOUR_USERNAME/soccer-analysis`
3. Add to `.env`:
   ```
   REPLICATE_API_TOKEN=your_token
   REPLICATE_MODEL=YOUR_USERNAME/soccer-analysis
   ```
4. Modify `server.js` to use Replicate API (see `replicate_integration_example.js`)

### Option 2: Keep Using Local + Fix JSON Error
The JSON serialization error in Colab has been fixed in the code.  
To use locally, just run `npm run server` as you currently do.

### Option 3: Use Colab Manually (Current Workaround)
1. Upload `colab_package.zip` to Colab
2. Upload video
3. Run analysis
4. Download JSON
5. Upload JSON to your web app

## Files Created
- `cog.yaml` - Replicate deployment config
- `predict.py` - Replicate predictor
- `REPLICATE_DEPLOY.md` - Detailed deployment guide
- `replicate_integration_example.js` - Example integration code

## Next Steps
Choose one of the options above based on your needs.
