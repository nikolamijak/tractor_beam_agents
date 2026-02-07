/**
 * Test DBOS Lazy Initialization
 * Verifies that DBOS initializes properly on first API call
 */

async function testLazyInit() {
  console.log('🧪 Testing DBOS lazy initialization...\n');

  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

  try {
    console.log('1. Starting test workflow...');
    const response = await fetch(`${baseUrl}/api/workflows/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflowName: 'DocumentToStories',
        input: {
          userId: 'test-user',
          documentPath: '/test.pdf',
          documentContent: 'Build a simple login page with email and password authentication.',
          technology: 'nodejs',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API request failed: ${error.error}`);
    }

    const result = await response.json();
    console.log('✅ Workflow started successfully!');
    console.log(`   Workflow ID: ${result.data.workflowId}`);
    console.log(`   Status: ${result.data.status}`);

    console.log('\n2. Checking workflow status...');
    const statusResponse = await fetch(`${baseUrl}/api/workflows/${result.data.workflowId}`);

    if (!statusResponse.ok) {
      throw new Error('Failed to get workflow status');
    }

    const status = await statusResponse.json();
    console.log('✅ Workflow status retrieved!');
    console.log(`   Status: ${status.data.status}`);
    console.log(`   Workflow Name: ${status.data.workflowName}`);

    console.log('\n✅ Lazy initialization test passed!');
    console.log('   DBOS initialized successfully on first API call.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testLazyInit();
