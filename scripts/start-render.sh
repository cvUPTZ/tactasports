#!/bin/bash

# Start the Python API server in the background
echo "Starting Python API server..."
cd python && python api.py &

# Start the Node.js server
echo "Starting Node.js server..."
cd ..
npm start
