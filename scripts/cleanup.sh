#!/bin/bash

# Kill processes using our ports
echo "Cleaning up processes..."

# Kill processes using port 3002 (Next.js)
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Kill processes using port 3100 (API)
lsof -ti:3100 | xargs kill -9 2>/dev/null

# Kill any running electron processes
pkill -f electron 2>/dev/null

echo "Cleanup complete!" 