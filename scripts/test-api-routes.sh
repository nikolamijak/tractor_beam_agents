#!/bin/bash
# Test API Routes
# Run this after starting the dev server: npm run dev

BASE_URL="http://localhost:3000"

echo "🧪 Testing DMAP API Routes..."
echo

# Test 1: List all agents
echo "1️⃣  GET /api/agents"
curl -s "$BASE_URL/api/agents" | jq .
echo

# Test 2: List agents by category
echo "2️⃣  GET /api/agents?category=workflow"
curl -s "$BASE_URL/api/agents?category=workflow" | jq '.count'
echo

# Test 3: Create a session
echo "3️⃣  POST /api/sessions"
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "technology": "nodejs"}')
echo $SESSION_RESPONSE | jq .
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.data.id')
echo "Session ID: $SESSION_ID"
echo

# Test 4: Get session details
echo "4️⃣  GET /api/sessions/$SESSION_ID"
curl -s "$BASE_URL/api/sessions/$SESSION_ID" | jq .
echo

# Test 5: Execute an agent
echo "5️⃣  POST /api/agents/[id]/execute"
echo "Finding orchestrator agent..."
AGENT_ID=$(curl -s "$BASE_URL/api/agents?category=workflow" | jq -r '.data[] | select(.agent_name=="dmas-orchestrator") | .id')
echo "Agent ID: $AGENT_ID"

curl -s -X POST "$BASE_URL/api/agents/$AGENT_ID/execute" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": \"I need to parse a requirements document\",
    \"sessionId\": \"$SESSION_ID\",
    \"userId\": \"test-user\"
  }" | jq .
echo

# Test 6: List workflows
echo "6️⃣  GET /api/workflows"
curl -s "$BASE_URL/api/workflows" | jq .
echo

echo "✅ API route tests complete!"
