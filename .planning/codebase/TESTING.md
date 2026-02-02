# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Runner:**
- Not configured - No Jest, Vitest, or other framework installed
- Test commands exist (`npm run test:agent-system`, `npm run verify:dbos`) but use manual scripts
- Tests run via tsx scripts in `scripts/` directory

**Assertion Library:**
- Not detected - Manual assertions in test scripts using console.log and process.exit()

**Run Commands:**
```bash
npm run test:agent-system   # Test agent execution system
npm run verify:dbos         # Verify DBOS setup and workflows
npm run type-check          # TypeScript type checking
npm run lint                # ESLint validation
npm run format              # Prettier formatting
```

## Test File Organization

**Location:**
- Test/verification scripts in `scripts/` directory (not co-located with source)
- Examples: `scripts/test-agent-system.ts`, `scripts/verify-dbos-setup.js`
- No `.test.ts` or `.spec.ts` files in `lib/` or `app/` directories

**Naming:**
- Verification scripts: `verify-*.ts` or `verify-*.js`
- Test scripts: `test-*.ts` or `test-*.js`
- Setup scripts: `setup-*.js`

**Structure:**
```
scripts/
├── setup-db.js              # Database initialization
├── test-agent-system.ts     # Agent execution testing
└── verify-dbos-setup.js     # DBOS initialization verification
```

## Test Structure

**Manual Test Pattern:**
No automated test framework. Tests are manual TypeScript/JavaScript scripts that:
1. Import test dependencies
2. Execute test scenarios
3. Print results to console
4. Exit with success/failure code

**Example Execution Pattern:**
```typescript
// From test-agent-system.ts
async function main() {
  try {
    // Setup
    console.log('[Test] Starting agent system tests...');

    // Execute test
    const result = await executor.execute('agent-name', 'input', context);

    // Assert/Verify
    if (!result.success) {
      console.error('[Test] ❌ Test failed:', result.error);
      process.exit(1);
    }

    console.log('[Test] ✅ Test passed');
    process.exit(0);
  } catch (error) {
    console.error('[Test] Fatal error:', error);
    process.exit(1);
  }
}

main();
```

## Mocking

**Framework:** None configured

**Patterns:**
- No built-in mocking - Database operations use real PostgreSQL connection
- API calls use real Anthropic SDK (no interceptors configured)
- Service injection for testing: `AgentExecutor` accepts optional `ClaudeApiService` parameter

**Example (Service Injection):**
```typescript
export class AgentExecutor {
  constructor(claudeApi?: ClaudeApiService) {
    this.claudeApi = claudeApi || getClaudeApiService();
  }
}

// Usage: Pass mock in tests
const mockClaudeApi = { ... };
const executor = new AgentExecutor(mockClaudeApi);
```

**What to Mock (If Framework Added):**
- Anthropic API calls (expensive, rate-limited)
- Database operations (use fixtures instead)
- File I/O operations

**What NOT to Mock:**
- DBOS workflow execution (needs real integration)
- Database repository methods (use test DB instance)
- Session/authentication flows

## Fixtures and Factories

**Test Data:**
- Not formalized - Tests use inline data
- Database seeding via `npm run db:seed` for 19 core agents

**Agent Fixture Example (from seed):**
```typescript
// Defined in db/seeds/001_core_agents.ts
// Seeded agents include:
// - workflow category (8 agents): Orchestrator, Intake, Ideation, ProductOwner, Developer, QA, DevOps, Summarizer
// - innovation category (5 agents): Prototype, PoC, Pilot, ProductStrategy, Product
// - utility category (6 agents): CodeReviewer, Security, SecurityAuditor, TestGenerator, ScrumMaster, FileParser
```

**Location:**
- Seed files: `db/seeds/001_core_agents.ts`
- No separate fixture directory
- Mock/test data created inline in test scripts

**Current Testing Approach:**
```typescript
// From AgentExecutor.testAgent()
const testSession = await sessionsRepo.create({
  user_id: 'system_test',
  technology: null,
  state: {},
  context: { test: true },
  // ... full session object created inline
});

const result = await this.execute(agentName, 'Test ping', {
  sessionId: testSession.id,
  userId: 'system_test',
  includeHistory: false,
});
```

## Coverage

**Requirements:** Not enforced

**View Coverage:** No coverage tool configured

**Current State:**
- No code coverage tracking
- No minimum coverage threshold
- No coverage reporting tools installed

## Test Types

**Unit Tests:**
- Not explicitly separated
- Individual service methods tested via script execution
- Focus: Service method behavior with valid inputs
- Scope: Single class or function in isolation (as much as possible without framework)

**Integration Tests:**
- Primary test approach in current setup
- Focus: Agent execution with real database and API calls
- Scope: Full execution path from API route to Claude API
- Examples: `test-agent-system.ts` tests real agent execution
- Database: Uses real PostgreSQL instance

**E2E Tests:**
- Not formalized
- Manual verification available via `verify:dbos` script
- Workflow execution tested end-to-end in test scripts

**Workflow Testing:**
- DBOS workflows tested via `getWorkflowStarters()` getter
- Tests invoke actual workflow functions with real inputs
- Success verified by checking workflow status and output
- Example from scripts:
```typescript
const { startDocumentToStoriesWorkflow } = getWorkflowStarters();
const handle = await startDocumentToStoriesWorkflow(input);
// Verify workflow execution completed
```

## Common Patterns

**Async Testing:**
```typescript
// Current pattern: Direct async/await in scripts
async function testAgent() {
  const result = await executor.execute(agentName, input, context);

  if (!result.success) {
    throw new Error(`Agent failed: ${result.error}`);
  }

  return result;
}

// Usage
const result = await testAgent();
console.log('[Test] Result:', result.output);
```

**Error Testing:**
```typescript
// Current pattern: Try-catch with explicit checks
try {
  const result = await executor.execute('invalid-agent', 'test', context);

  if (result.success) {
    throw new Error('Should have failed for invalid agent');
  }

  console.log('[Test] ✅ Correctly rejected invalid agent');
} catch (error) {
  console.log('[Test] ❌ Unexpected error:', error);
  process.exit(1);
}
```

**Test Session Setup:**
```typescript
// Pattern: Create session for each test
const session = await sessionsRepo.create({
  user_id: 'test_user',
  technology: null,
  state: {},
  context: { test: true, scenario: 'test_scenario' },
  total_messages: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_cache_creation_tokens: 0,
  total_cache_read_tokens: 0,
  total_cost_usd: 0,
  expires_at: null,
  metadata: { test: true },
});

// Run test with session
const result = await executor.execute(agentName, input, {
  sessionId: session.id,
  userId: 'test_user',
  includeHistory: false,
});

// Cleanup
await sessionsRepo.delete(session.id);
```

## Testing the Workflow System

**Current Approach:**
- `verify:dbos` script checks DBOS initialization and workflow registration
- Workflows tested via registry getter pattern
- Real workflow execution in background via DBOS SDK

**Pattern:**
```typescript
// From lib/dbos/init.ts
// Get registered workflows
const { startDocumentToStoriesWorkflow } = getWorkflowStarters();

// Start workflow execution
const handle = await startDocumentToStoriesWorkflow({
  userId: 'test',
  documentPath: '/test.txt',
  documentContent: 'test content',
});

// Verify execution started
console.log('Workflow ID:', handle.workflowID);
```

## Testing DBOS-Specific Concerns

**Determinism Testing:**
- Workflows must be deterministic (no Date.now() directly in workflow function)
- Non-deterministic operations wrapped in `DBOS.runStep()`
- Tests verify: Workflows execute consistently with same inputs

**Step Execution:**
- Each step wrapped in `DBOS.runStep()` with name
- Steps can be retried independently
- Tests verify: All steps complete and produce expected output

**State Durability:**
- DBOS persists workflow state automatically
- Tests verify: Workflow state recovered if process crashes
- Current approach: Manual verification in `verify:dbos` script

## Future Testing Improvements

**Recommended Additions:**
1. Add Jest or Vitest for automated test framework
2. Create test setup files (fixtures, factories) in `scripts/__fixtures__/`
3. Implement mocking for Anthropic API calls to reduce costs
4. Add pre-commit hooks to run tests automatically
5. Implement code coverage tracking (target: >70% for lib/, >50% for app/)
6. Create separate test database for CI/CD pipeline
7. Add E2E test suite for full workflow scenarios

**Test Database Setup:**
```bash
# Recommended: Separate test database instance
TEST_DATABASE_URL=postgresql://test_user:test_pwd@localhost:5433/tractor_beam_test
npm run db:migrate -- --env test
npm run test
```

---

*Testing analysis: 2026-02-02*
