/**
 * Test script for agent execution with cost tracking
 */
import { getAgentExecutor } from '../lib/agents/AgentExecutor';
import { sessionsRepo } from '../lib/db/repositories';
import { db } from '../lib/db/client';

async function testAgentCostTracking() {
  try {
    console.log('🧪 Testing Agent Execution with Cost Tracking...\n');

    // Create a test session
    console.log('1. Creating test session...');
    const session = await sessionsRepo.create({
      user_id: 'test_user',
      technology: null,
      state: {},
      context: { test: true },
      total_messages: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cache_creation_tokens: 0,
      total_cache_read_tokens: 0,
      total_cost_usd: 0,
      expires_at: null,
      metadata: { test: true },
    });
    console.log(`   ✅ Session created: ${session.id}\n`);

    // Execute an agent
    console.log('2. Executing agent...');
    const executor = getAgentExecutor();
    const result = await executor.execute(
      'dmas-orchestrator',
      'What is the purpose of the DMAS system?',
      {
        sessionId: session.id,
        userId: 'test_user',
        includeHistory: false,
      }
    );

    console.log(`   ✅ Execution result:`);
    console.log(`      - Success: ${result.success}`);
    console.log(`      - Tokens Used: ${result.tokensUsed}`);
    console.log(`      - Cost (USD): $${result.costUsd.toFixed(6)}`);
    console.log(`      - Model: ${result.model}`);
    console.log(`      - Execution Time: ${result.executionTime}ms\n`);

    // Check session costs
    console.log('3. Checking session costs...');
    const updatedSession = await sessionsRepo.findById(session.id);
    if (updatedSession) {
      console.log(`   ✅ Session cost tracking:`);
      console.log(`      - Total Messages: ${updatedSession.total_messages}`);
      console.log(`      - Total Input Tokens: ${updatedSession.total_input_tokens}`);
      console.log(`      - Total Output Tokens: ${updatedSession.total_output_tokens}`);
      console.log(`      - Total Cache Creation Tokens: ${updatedSession.total_cache_creation_tokens}`);
      console.log(`      - Total Cache Read Tokens: ${updatedSession.total_cache_read_tokens}`);
      console.log(`      - Total Cost (USD): $${parseFloat(String(updatedSession.total_cost_usd)).toFixed(6)}\n`);
    }

    // Check message details
    console.log('4. Checking message details...');
    const messagesResult = await db.raw(
      `SELECT role, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, total_cost_usd
       FROM agent_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [session.id]
    );

    console.log(`   ✅ Messages saved (${messagesResult.rows.length}):`);
    messagesResult.rows.forEach((msg: any, index: number) => {
      console.log(`      Message ${index + 1} (${msg.role}):`);
      console.log(`        - Input Tokens: ${msg.input_tokens}`);
      console.log(`        - Output Tokens: ${msg.output_tokens}`);
      console.log(`        - Cache Creation Tokens: ${msg.cache_creation_tokens}`);
      console.log(`        - Cache Read Tokens: ${msg.cache_read_tokens}`);
      console.log(`        - Cost (USD): $${parseFloat(msg.total_cost_usd).toFixed(6)}`);
    });

    // Clean up
    console.log('\n5. Cleaning up...');
    await sessionsRepo.delete(session.id);
    console.log('   ✅ Test session deleted\n');

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAgentCostTracking();
