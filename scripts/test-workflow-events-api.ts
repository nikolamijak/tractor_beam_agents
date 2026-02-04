/**
 * Test script for workflow events API endpoint
 * Starts a workflow and polls the events API to verify real-time updates
 */

import { DBOS } from '@dbos-inc/dbos-sdk';

async function testWorkflowEventsAPI() {
  console.log('🧪 Testing Workflow Events API\n');

  try {
    // Configure and launch DBOS
    console.log('Initializing DBOS...');
    DBOS.setConfig({
      name: 'test-events-api',
      systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL!,
    });
    await DBOS.launch();
    console.log('✅ DBOS initialized\n');

    // Start a test workflow
    console.log('Starting DocumentToStoriesWorkflow...');
    const { getWorkflowStarters } = await import('@/lib/dbos');
    const { startDocumentToStoriesWorkflow } = getWorkflowStarters();
    const handle = await startDocumentToStoriesWorkflow({
      userId: 'test-user',
      documentContent: 'Test document for API testing: Build a simple REST API with user authentication.',
      sessionId: 'test-session'
    });

    const workflowId = handle.getWorkflowID();
    console.log(`✅ Workflow started: ${workflowId}\n`);

    // Poll API endpoint
    console.log('Polling API endpoint for events...\n');
    let previousStepCount = 0;
    let pollCount = 0;

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        const response = await fetch(`http://localhost:3000/api/workflows/${workflowId}/events`);

        if (!response.ok) {
          console.error(`❌ API error: ${response.status} ${response.statusText}`);
          const errorBody = await response.text();
          console.error(`Response: ${errorBody}`);
          return;
        }

        const data = await response.json();

        // Display new steps
        if (data.steps.length > previousStepCount) {
          console.log(`📊 Poll #${pollCount} - Steps: ${data.steps.length}, Status: ${data.status}`);

          data.steps.slice(previousStepCount).forEach((step: any) => {
            if (step.started) {
              console.log(`  ▶️  ${step.stepName} started`);
            }
            if (step.completed) {
              const duration = step.completed.durationMs || 0;
              console.log(`  ✅ ${step.stepName} completed (${duration}ms)`);
              if (step.completed.cost) {
                const tokens = step.completed.cost.tokensUsed || 0;
                const cost = step.completed.cost.costUsd || 0;
                console.log(`     💰 Cost: ${tokens} tokens, $${cost.toFixed(4)}`);
              }
              if (step.completed.output) {
                const output = typeof step.completed.output === 'string'
                  ? step.completed.output.substring(0, 100)
                  : JSON.stringify(step.completed.output).substring(0, 100);
                console.log(`     📝 Output: ${output}...`);
              }
            }
            if (step.failed) {
              console.log(`  ❌ ${step.stepName} failed: ${step.failed.error}`);
            }
          });

          previousStepCount = data.steps.length;
        }

        // Check for completion
        if (data.status === 'SUCCESS' || data.status === 'ERROR') {
          clearInterval(pollInterval);
          console.log(`\n${'='.repeat(60)}`);
          if (data.status === 'SUCCESS') {
            console.log(`✅ Workflow completed successfully!`);
          } else {
            console.log(`❌ Workflow failed with error`);
          }
          console.log(`Total steps: ${data.steps.length}`);
          console.log(`Total polls: ${pollCount}`);
          console.log(`${'='.repeat(60)}\n`);

          await DBOS.shutdown();
          process.exit(data.status === 'SUCCESS' ? 0 : 1);
        }

      } catch (error) {
        console.error('❌ Poll error:', error);
      }
    }, 1000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      console.error('\n⏱️  Timeout - workflow took too long (2 minutes)');
      DBOS.shutdown().then(() => process.exit(1));
    }, 120000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await DBOS.shutdown();
    process.exit(1);
  }
}

// Run the test
testWorkflowEventsAPI().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
