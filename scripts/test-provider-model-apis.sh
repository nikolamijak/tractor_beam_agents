#!/bin/bash
# Test script for provider and model API endpoints
# Run this after starting the dev server: npm run dev

BASE_URL="http://localhost:3000/api"

echo "🧪 Testing Provider & Model Management APIs"
echo "==========================================="
echo ""

# Test 1: List providers
echo "1. GET /api/providers"
curl -s "$BASE_URL/providers" | jq .
echo ""

# Test 2: List models with provider
echo "2. GET /api/models?withProvider=true"
curl -s "$BASE_URL/models?withProvider=true" | jq .
echo ""

# Test 3: Get models by provider
echo "3. GET /api/models/by-provider/anthropic"
curl -s "$BASE_URL/models/by-provider/anthropic" | jq .
echo ""

# Test 4: Get specific provider (get ID from step 1)
echo "4. GET /api/providers/{id}"
echo "   (Run manually with actual provider ID)"
echo ""

# Test 5: Get specific model (get ID from step 2)
echo "5. GET /api/models/{id}?withProvider=true"
echo "   (Run manually with actual model ID)"
echo ""

# Test 6: Create a test session and check cost
echo "6. Create test session and execute agent"
SESSION_ID=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "technology": null
  }' | jq -r '.data.id')

echo "   Session ID: $SESSION_ID"

# Execute agent (replace with actual agent execute endpoint)
echo "   Executing agent..."
curl -s -X POST "$BASE_URL/agents/execute" \
  -H "Content-Type: application/json" \
  -d "{
    \"agentName\": \"dmas-orchestrator\",
    \"input\": \"Test message\",
    \"sessionId\": \"$SESSION_ID\"
  }" | jq .

# Get session cost
echo ""
echo "7. GET /api/sessions/$SESSION_ID/cost"
curl -s "$BASE_URL/sessions/$SESSION_ID/cost" | jq .
echo ""

echo "==========================================="
echo "✅ API tests complete!"
