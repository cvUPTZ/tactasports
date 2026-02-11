#!/bin/bash

# Update and install system dependencies
echo "Installing system dependencies..."
apt-get update && apt-get install -y libgl1 libglib2.0-0

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start the server
echo "Starting server..."
python api.py
