# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Service files: `CamelCase` with suffix (e.g., `ClaudeApiService.ts`, `CostCalculatorService.ts`)
- Repository files: `camelCase` generic name with `.ts` extension (e.g., `repositories.ts`)
- Utility/helper files: `camelCase` (e.g., `validation.ts`, `formatting.ts`)
- React hooks: `use` prefix in `camelCase` (e.g., `useChat.ts`, `useWorkflow.ts`)
- API routes: Match directory structure with route.ts files (e.g., `app/api/agents/route.ts`)
- Type definition files: `types.ts` within respective directories (e.g., `lib/db/types.ts`)
- Workflow files: `PascalCase` ending with `Workflow.ts` (e.g., `DocumentToStoriesWorkflow.ts`)

**Functions:**
- Regular functions: `camelCase` (e.g., `getAgentExecutor()`, `isValidUUID()`)
- Service methods: `camelCase` (e.g., `sendMessage()`, `calculate Cost()`)
- Repository methods: `camelCase` verb-first pattern (e.g., `findById()`, `listWithModels()`, `incrementRequests()`)
- Static class methods: `camelCase` (e.g., `CostCalculatorService.calculateCost()`)
- Async functions: No special naming, use async/await naturally (e.g., `async sendMessage()`)
- Private methods: `private` keyword used, names still `camelCase` (e.g., `private async loadAgent()`)

**Variables:**
- Constants: `UPPER_SNAKE_CASE` for module-level constants (e.g., `DBOS_INITIALIZED`)
- Local variables: `camelCase` (e.g., `sessionId`, `agentExecutor`, `totalCost`)
- Object keys: Snake case for database field names matching schema (e.g., `agent_name`, `model_id`, `created_at`)
- Booleans: `is` or `has` prefix (e.g., `isEnabled`, `hasModels`, `is_active` in DB contexts)
- Parameters: `camelCase` (e.g., `agentName`, `documentContent`)

**Types:**
- Interface names: `PascalCase` (e.g., `AgentDefinition`, `AgentExecutionContext`, `SendMessageOptions`)
- Type definitions: `PascalCase` (e.g., `TokenUsage`, `ModelPricing`)
- Enum members: `UPPER_SNAKE_CASE` or `PascalCase` depending on context
- Generic parameters: Single letter or descriptive `PascalCase` (e.g., `T`, `TResponse`)
- DB type variants: Suffix with `Insert` or `Update` (e.g., `AgentDefinitionInsert`, `ProviderUpdate`)

## Code Style

**Formatting:**
- Tool: Prettier 3.8.1
- Semicolons: Enabled (`semi: true`)
- Trailing commas: ES5 style (`trailingComma: "es5"`)
- Single quotes: Enabled (`singleQuote: true`)
- Print width: 80 characters
- Tab width: 2 spaces
- Tabs: Disabled (use spaces)

**Linting:**
- Tool: ESLint 9.39.2 with Next.js config
- Config extends: `next/core-web-vitals` and `next/typescript`
- No additional custom rules configured beyond Next.js defaults

**Line Length:**
- Target: 80 characters (enforced by Prettier)
- Long lines broken across multiple lines (parameter lists, complex expressions)

## Import Organization

**Order:**
1. External library imports (`react`, `next`, third-party packages)
2. Type imports from external libraries (`import type { ... } from '@anthropic-ai/sdk'`)
3. Internal absolute imports from `@/` path alias
4. Internal relative imports (rarely used, absolute preferred)

**Example from AgentExecutor.ts:**
```typescript
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ClaudeApiService, getClaudeApiService } from '../services/ClaudeApiService';
import { CostCalculatorService } from '../services/CostCalculatorService';
import {
  agentDefinitionsRepo,
  modelsRepo,
  sessionsRepo,
  messagesRepo,
  agentHealthRepo,
} from '../db/repositories';
import type { AgentDefinition, AgentMessage, ModelWithProvider, TokenUsage } from '../db/types';
```

**Path Aliases:**
- `@/*` maps to project root directory
- Used consistently throughout codebase
- Enables clean imports regardless of nesting depth

## Error Handling

**Patterns:**

1. **Try-Catch with Type Checking:**
```typescript
try {
  // operation
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('[Component] Description:', error);
  throw new Error(`Context: ${errorMessage}`);
}
```

2. **SDK-Specific Error Handling:**
```typescript
if (error instanceof Anthropic.APIError) {
  console.error('[ClaudeApiService] API Error:', {
    status: error.status,
    message: error.message,
    type: error.name,
  });
  throw new Error(`Claude API Error (${error.status}): ${error.message}`);
}
```

3. **Graceful Degradation (Non-Critical Operations):**
```typescript
try {
  await updateAgentHealth(agentId, tokensUsed, failed);
} catch (error) {
  console.error('[AgentExecutor] Failed to update health:', error);
  // Don't throw - health metric failures shouldn't break agent execution
}
```

4. **Return Error Codes (API Routes):**
```typescript
return NextResponse.json(
  { success: false, error: 'Missing required field: agent_name' },
  { status: 400 }
);
```

5. **Throw Early (Validation):**
```typescript
if (!agent) {
  throw new Error(`Agent "${agentName}" not found in database`);
}
```

## Logging

**Framework:** Console (native JavaScript) with bracket notation for context

**Patterns:**

1. **Bracket notation with module context:**
```typescript
console.log('[ClaudeApiService] Initialized with model: ${this.defaultModel}');
console.error('[AgentExecutor] Error executing agent "${agentName}":', error);
console.info('[DocumentToStories] Intake completed: ${result.tokensUsed} tokens');
```

2. **DBOS-specific logging (from workflows):**
```typescript
DBOS.logger.info(`[DocumentToStories] Intake completed: ${result.tokensUsed} tokens`);
DBOS.logger.error('[DBOS] Initialization failed:', error);
```

3. **When to log:**
- Service initialization (with model/config info)
- API request/response boundaries
- Step transitions in workflows
- Error conditions with context
- Performance metrics (tokens, execution time)
- Connection tests and health checks

4. **What NOT to log:**
- Sensitive data (API keys, passwords)
- Large response bodies without context
- Debug-only statements in production code

## Comments

**When to Comment:**
- Complex business logic requiring explanation
- Non-obvious algorithm decisions
- IMPORTANT warnings about state management or initialization order
- TODO items blocking future work
- Database schema relationships

**JSDoc/TSDoc:**
- Used extensively in service classes and public APIs
- Document all public methods with purpose and parameters
- Example from ClaudeApiService:
```typescript
/**
 * Send a message to Claude API
 */
async sendMessage(options: SendMessageOptions): Promise<ClaudeResponse>
```

- Include parameter descriptions for complex options
- Example from AgentExecutor:
```typescript
/**
 * Load agent definition from database with model information
 * @private
 */
private async loadAgent(agentName: string): Promise<AgentWithModel>
```

**Comment Styles:**
- JSDoc style for public APIs: `/** ... */`
- Single-line for simple explanations: `// ...`
- Markdown formatting acceptable in multi-line comments
- Section dividers for large blocks: `// ============================================================================`

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Service methods typically 5-30 lines
- Utility functions 2-15 lines
- Complex workflows broken into named steps

**Parameters:**
- Use object parameters for 3+ arguments (e.g., `options: UseChatOptions`)
- Database operations use insert/update type objects (e.g., `AgentDefinitionInsert`)
- API routes destructure from `NextRequest`

**Return Values:**
- Explicit return types in TypeScript
- Service methods return typed interfaces (e.g., `Promise<AgentExecutionResult>`)
- Helper functions return appropriate types or null for not-found
- Async functions properly typed as `Promise<T>`

**Example (Good Function Design):**
```typescript
async execute(
  agentName: string,
  input: string,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  // Single responsibility: execute agent and return result
  // Parameters: individual args for required, context object for optional
  // Return: explicit typed interface
}
```

## Module Design

**Exports:**
- Service classes: Export class and singleton getter (e.g., `getClaudeApiService()`)
- Repository objects: Export as named object (e.g., `export const agentDefinitionsRepo = {...}`)
- Utilities: Export named functions (e.g., `export function isValidUUID()`)
- Hooks: Export single hook function (e.g., `export function useChat()`)

**Example Pattern (Services):**
```typescript
export class ClaudeApiService { ... }

let claudeApiServiceInstance: ClaudeApiService | null = null;

export function getClaudeApiService(config?: ClaudeApiConfig): ClaudeApiService {
  if (!claudeApiServiceInstance) {
    claudeApiServiceInstance = new ClaudeApiService(config);
  }
  return claudeApiServiceInstance;
}
```

**Barrel Files:**
- Used in `lib/` subdirectories to re-export public API
- Example: `lib/agents/index.ts` exports `AgentExecutor` and `getAgentExecutor`
- Makes imports cleaner: `import { AgentExecutor } from '@/lib/agents'`

**File Organization:**
- One main export per file (class, hook, or primary function)
- Related types exported alongside implementation
- Internal utilities kept private or in separate files

## Async Patterns

**Pattern:** Native async/await, no promise chains
```typescript
async function workflowFunction() {
  const result1 = await step1();
  const result2 = await step2(result1);
  return { result1, result2 };
}
```

**Parallel Execution (Safe):**
```typescript
// For DBOS workflows, use Promise.allSettled() not Promise.all()
const results = await Promise.allSettled([
  step1(),
  step2(),
  step3(),
]);
```

**Error Propagation:**
- Let errors bubble unless explicitly handling for graceful degradation
- Use try-catch at major boundaries (API routes, service methods)

---

*Convention analysis: 2026-02-02*
