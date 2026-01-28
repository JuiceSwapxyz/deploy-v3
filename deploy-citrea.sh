#!/bin/bash

# Citrea Testnet JuiceSwap V3 Deployment Script

# Configuration (can be overridden via environment variables)
CITREA_RPC_URL="${CITREA_RPC_URL:-https://rpc.testnet.citreascan.com}"
WETH9_ADDRESS="${WETH9_ADDRESS:-0x8d0c9d1c17aE5e40ffF9bE350f57840E9E66Cd93}"
NATIVE_CURRENCY_LABEL="${NATIVE_CURRENCY_LABEL:-cBTC}"

# Check if private key is provided
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: PRIVATE_KEY environment variable is not set"
  echo "Please export your private key: export PRIVATE_KEY=your_private_key_here"
  exit 1
fi

# Check if owner address is provided
if [ -z "$OWNER_ADDRESS" ]; then
  echo "❌ Error: OWNER_ADDRESS environment variable is not set"
  echo "Please export the owner address: export OWNER_ADDRESS=your_owner_address_here"
  exit 1
fi

echo "🧃 Starting JuiceSwap V3 deployment on Citrea Testnet"
echo "================================================"
echo "📍 RPC URL: $CITREA_RPC_URL"
echo "💎 WETH9 Address: $WETH9_ADDRESS"
echo "🏷️  Native Currency: $NATIVE_CURRENCY_LABEL"
echo "👤 Owner Address: $OWNER_ADDRESS"
echo "================================================"
echo ""

# Clean previous state if exists
if [ -f "state.json" ]; then
  echo "⚠️  Found existing state.json file"
  read -p "Do you want to remove it and start fresh? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm state.json
    echo "✅ Removed existing state.json"
  fi
fi

# Run the deployment
echo "📦 Starting deployment..."
npx ts-node index.ts \
  --private-key "$PRIVATE_KEY" \
  --json-rpc "$CITREA_RPC_URL" \
  --weth9-address "$WETH9_ADDRESS" \
  --native-currency-label "$NATIVE_CURRENCY_LABEL" \
  --owner-address "$OWNER_ADDRESS" \
  --confirmations 2 \
  --state ./state.json

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment completed successfully!"
  echo "📄 Check state.json for deployed contract addresses"
  
  # Display deployed addresses
  if [ -f "state.json" ]; then
    echo ""
    echo "📍 Deployed Contracts:"
    echo "===================="
    cat state.json | python3 -m json.tool 2>/dev/null || cat state.json
  fi
else
  echo ""
  echo "❌ Deployment failed!"
  echo "Check the error messages above and state.json for partial deployment status"
  exit 1
fi