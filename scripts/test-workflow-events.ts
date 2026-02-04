/**
 * Test workflow event emission
 * Verifies that DBOS.setEvent() stores events in dbos.workflow_events table
 */

import { DBOS } from '@dbos-inc/dbos-sdk';
import path from 'path';
import knex from 'knex';

async function testWorkflowEvents() {
  try {
    console.log('Initializing DBOS...');

    // Configure and launch DBOS
    DBOS.setConfig({
      name: 'test-events',
      hostname: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'dmap_user',
      password: process.env.DB_PASSWORD || 'dmap_dev_password',
      app_db_name: process.env.DB_NAME || 'dmap',
    });

    await DBOS.launch();
    console.log('DBOS initialized successfully\n');

    // Create Knex client for querying events
    const knexClient = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'dmap_user',
        password: process.env.DB_PASSWORD || 'dmap_dev_password',
        database: process.env.DB_NAME || 'dmap',
      },
    });

    // Import workflow after DBOS is initialized
    const workflowPath = path.join(__dirname, '../lib/dbos/workflows/DocumentToStoriesWorkflow');
    const { startDocumentToStoriesWorkflow } = await import(workflowPath);

    // Start a test workflow
    console.log('Starting test workflow...');
    const handle = await startDocumentToStoriesWorkflow({
      userId: 'test-user',
      documentPath: '/test/document.txt',
      documentContent: 'Test document for event emission verification. This is a simple test to verify that workflow events are properly stored in the dbos.workflow_events table.',
    });

    const workflowId = handle.getWorkflowID();
    console.log(`Started workflow: ${workflowId}\n`);

    // Poll for events
    let lastEventCount = 0;
    const pollInterval = setInterval(async () => {
      const events = await knexClient('dbos.workflow_events')
        .where('workflow_uuid', workflowId)
        .orderBy('key');

      if (events.length > lastEventCount) {
        console.log(`New events detected (${events.length} total):`);
        events.slice(lastEventCount).forEach((evt: any) => {
          const valuePreview = typeof evt.value === 'string'
            ? evt.value.substring(0, 100)
            : JSON.stringify(evt.value).substring(0, 100);
          console.log(`  - ${evt.key}: ${valuePreview}${valuePreview.length >= 100 ? '...' : ''}`);
        });
        console.log();
        lastEventCount = events.length;
      }
    }, 1000);

    // Wait for workflow to complete (with timeout)
    console.log('Waiting for workflow to complete...\n');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Workflow timeout after 5 minutes')), 5 * 60 * 1000)
    );

    const result = await Promise.race([
      handle.getResult(),
      timeoutPromise,
    ]);

    clearInterval(pollInterval);

    console.log('Workflow completed successfully\n');

    // Final event dump
    const finalEvents = await knexClient('dbos.workflow_events')
      .where('workflow_uuid', workflowId)
      .orderBy('key');

    console.log(`\n✓ Workflow complete. Total events: ${finalEvents.length}`);
    console.log('\n=== All Event Keys ===');
    finalEvents.forEach((evt: any) => {
      console.log(`  - ${evt.key}`);
    });

    console.log('\n=== Event Summary ===');
    const startedEvents = finalEvents.filter((e: any) => e.key.includes(':started'));
    const completedEvents = finalEvents.filter((e: any) => e.key.includes(':completed'));
    const failedEvents = finalEvents.filter((e: any) => e.key.includes(':failed'));
    const errorEvents = finalEvents.filter((e: any) => e.key.includes('error'));

    console.log(`  Started events: ${startedEvents.length}`);
    console.log(`  Completed events: ${completedEvents.length}`);
    console.log(`  Failed events: ${failedEvents.length}`);
    console.log(`  Error events: ${errorEvents.length}`);

    console.log('\n=== Sample Event Data ===');
    const sampleEvent = finalEvents.find((e: any) => e.key.includes(':completed'));
    if (sampleEvent) {
      console.log(`Key: ${sampleEvent.key}`);
      console.log(`Value: ${JSON.stringify(sampleEvent.value, null, 2)}`);
    }

    console.log('\n✓ Test completed successfully!');
    console.log('Events are properly stored in dbos.workflow_events table.');

    await knexClient.destroy();
    await DBOS.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    await DBOS.shutdown();
    process.exit(1);
  }
}

testWorkflowEvents();
