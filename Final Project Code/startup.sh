#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "----------------------------------------"
echo "   Backend Startup Script"
echo "----------------------------------------"

# 1) Google Maps API Key
export GOOGLE_MAPS_API_KEY="YOUR_NEW_API_KEY_HERE"
echo "Google Maps API Key set."

echo "----------------------------------------"
echo " Startup Script Complete"
echo "----------------------------------------"
