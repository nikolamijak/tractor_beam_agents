# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Layered architecture with event-driven workflow orchestration, database-driven agent system, and API-first design

**Key Characteristics:**
- **Database-driven agents**: All agent definitions (prompts, models, parameters) stored in PostgreSQL, loaded at runtime
- **DBOS durable workflows**: Multi-step workflows with DBOS SDK for reliable, resumable execution
- **Next.js API routes**: RESTful backend with structured repository pattern for database access
- **Client-server separation**: React frontend with clear API boundaries, no server-side rendering of business logic

## Layers

**Presentation Layer:**
- Purpose: User interface and client interactions
- Location: `app/`, `components/`
- Contains: Next.js page components (`.tsx`), React UI components, client hooks
- Depends on: API routes (via fetch), React state management (Zustand via ClientWrapper)
- Used by: Web browser clients

**API Layer:**
- Purpose: RESTful endpoints for agents, workflows, sessions, models, providers
- Location: `app/api/`
- Contains: Next.js route handlers (`route.ts`), request validation, response formatting
- Depends on: Service layer, database repositories
- Used by: Frontend, external integrations, workflow API consumers

**Service Layer:**
- Purpose: Business logic and orchestration
- Location: `lib/services/`, `lib/agents/`, `lib/dbos/`
- Contains:
  - `AgentExecutor.ts`: Executes agents by loading from DB, calling Claude API, tracking costs/health
  - `ClaudeApiService.ts`: Wraps Anthropic SDK, handles API configuration
  - `CostCalculatorService.ts`: Calculates token costs based on model pricing
  - `workflowRegistration.ts`: Safe workflow registration to prevent duplicate registration
  - DBOS workflow functions: Multi-step orchestration with durable state
- Depends on: Database repositories, Claude API, DBOS SDK
- Used by: API routes, other services

**Workflow Layer:**
- Purpose: Durable, resumable multi-step processes
- Location: `lib/dbos/workflows/`
- Contains: Workflow functions using DBOS.runStep(), step definitions, input/output types
- Examples:
  - `DocumentToStoriesWorkflow.ts`: Parse doc → Extract requirements → Convert to stories → Prioritize
  - `StoryImplementationWorkflow.ts`: Generate architecture → Write code → Generate tests → Code review
  - `CodeReviewWorkflow.ts`: Code analysis → Security review → Test coverage review
  - `PrototypeWorkflow.ts`: Prototype design → Implementation → Validation
- Depends on: AgentExecutor, database repositories
- Used by: Workflow start API route

**Database Access Layer:**
- Purpose: Type-safe database operations
- Location: `lib/db/`
- Contains:
  - `client.ts`: Knex.js singleton instance, query helpers, transactions
  - `repositories.ts`: Entity-specific repositories (agents, models, sessions, messages, etc.)
  - `types.ts`: TypeScript interfaces matching database schema
  - `queries.ts`: Complex raw SQL queries
- Depends on: PostgreSQL database
- Used by: Services, API routes

**Database Schema:**
- Purpose: Persistent storage for agents, models, sessions, and DBOS workflow state
- Divided into two domains:
  - **Application schema** (`agent_definitions`, `agent_messages`, `sessions`, `agent_health`, `stories`, `artifacts`, `technology_extensions`, `providers`, `models`)
  - **DBOS schema** (`dbos_workflows`, `dbos_workflow_steps`, `dbos_workflow_state` - managed by DBOS SDK)

## Data Flow

**Agent Execution Flow:**

1. API route receives request → POST `/api/agents/[id]/execute`
2. Validates input, gets or creates session
3. Calls `AgentExecutor.execute(agentName, input, context)`
4. AgentExecutor loads agent definition from DB including:
   - System prompt (stored in `agent_definitions.system_prompt`)
   - Model ID → Loads model info with provider details
   - Max tokens, temperature, tools
5. AgentExecutor builds message array (optionally includes conversation history from `agent_messages`)
6. Calls ClaudeApiService.sendMessage() with system prompt and messages
7. Anthropic SDK makes API call with agent's selected model
8. Response returned with token usage and model info
9. AgentExecutor saves conversation pair to `agent_messages` table with detailed token tracking
10. Updates session cost aggregates in `sessions` table
11. Updates agent health metrics in `agent_health` table
12. Returns parsed output (JSON if parseable, else raw text) to client

**Workflow Execution Flow:**

1. API route receives POST `/api/workflows/start` with workflow name and input
2. Retrieves workflow starter from registry (never re-imports workflow files)
3. Calls `DBOS.startWorkflow()` with input to start in background
4. DBOS handles:
   - Initial workflow execution
   - Durability: persists state to `dbos_workflow_*` tables
   - Resumability: can resume from last step if interrupted
5. Each workflow step:
   - Wrapped in `DBOS.runStep()` for durability
   - Can call agents via AgentExecutor
   - Can perform DB operations
   - Results persisted to DBOS state tables
6. Workflow completes, returns handle with `workflowID` to client
7. Client can poll GET `/api/workflows/[id]` to check status
8. Results stored in application tables (e.g., `stories`, `artifacts`)

**State Management:**

- **Conversation History**: Stored in `agent_messages` per session
- **Session State**: Tracked in `sessions.state` (JSON) for user state
- **Workflow State**: DBOS manages via `dbos_workflow_state` for resumability
- **Agent Health**: Tracked in `agent_health` with failure rates and metrics

## Key Abstractions

**AgentExecutor:**
- Purpose: Generic agent executor that loads ALL agents from database
- Location: `lib/agents/AgentExecutor.ts`
- Pattern: Singleton instance accessed via `getAgentExecutor()`
- Key methods:
  - `execute(agentName, input, context)`: Main execution method
  - `loadAgent(agentName)`: Load agent def and model from DB
  - `buildMessages(input, context)`: Build message array with optional history
  - `saveMessages()`: Persist conversation and costs to DB
  - `updateSessionCosts()`: Aggregate costs in session
  - `updateAgentHealth()`: Track health metrics
- Reusability: Used by workflows, API routes, and other services

**Repository Pattern:**
- Purpose: Type-safe database access with high-level methods
- Location: `lib/db/repositories.ts`
- Examples:
  - `agentDefinitionsRepo.findByName()`: Get agent by name
  - `modelsRepo.findByIdWithProvider()`: Get model with provider details
  - `messagesRepo.create()`: Save conversation message
  - `sessionsRepo.updateCosts()`: Update session aggregates
- Pattern: Object with async methods, no class instantiation

**Workflow Registry:**
- Purpose: Prevent duplicate workflow registration in production builds
- Location: `lib/dbos/init.ts`, `lib/dbos/index.ts`
- Pattern: Global state stores registered workflows, survives Next.js HMR
- Access: `getWorkflowStarters()` returns registry object
- Safety: Workflows use `safeRegisterWorkflow()` to prevent re-registration

**DBOS Safe Registration:**
- Purpose: Prevent "duplicate registration" errors when Next.js imports modules multiple times
- Location: `lib/dbos/workflowRegistration.ts`
- Pattern: Wrapper around `DBOS.registerWorkflow()` with name-based deduplication
- Usage: `export const myWorkflow = safeRegisterWorkflow('myWorkflow', myWorkflowFunction)`

## Entry Points

**Server Initialization:**
- Location: `instrumentation.ts`
- Triggers: When Next.js server starts
- Responsibilities:
  - Calls `initializeDBOS()` from `lib/dbos/init.ts`
  - Configures DBOS with database URL
  - Imports and registers all workflows
  - Launches DBOS SDK
  - Stores workflows in global registry
  - All happens BEFORE API routes load

**API Root:**
- Location: `app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Renders dashboard or home page

**Agent Execution:**
- Location: `app/api/agents/[id]/execute/route.ts`
- Triggers: POST `/api/agents/[id]/execute`
- Responsibilities:
  - Validates agent ID and input
  - Gets or creates session
  - Calls AgentExecutor
  - Returns result with cost and token info

**Workflow Start:**
- Location: `app/api/workflows/start/route.ts`
- Triggers: POST `/api/workflows/start`
- Responsibilities:
  - Validates workflow name and input
  - Routes to appropriate workflow handler
  - Starts workflow in background via DBOS
  - Returns handle with workflowID

**Agent Management:**
- Location: `app/api/agents/route.ts`
- Triggers: GET `/api/agents`, POST `/api/agents`
- Responsibilities:
  - GET: List agents with optional filters (category, technology, enabled status)
  - POST: Register new agent with system prompt and model

## Error Handling

**Strategy:** Fail gracefully, log errors, return meaningful responses to clients

**Patterns:**

- **API Routes**: Try-catch blocks, return NextResponse with error message and appropriate HTTP status (400 for validation, 500 for server errors)
  - Example: `app/api/agents/[id]/execute/route.ts` wraps entire handler in try-catch

- **AgentExecutor**: Errors in message saving/health updates don't break execution
  - Uses nested try-catch blocks for non-critical operations
  - Logs errors but returns success if agent execution itself succeeds
  - Updates health metrics on failure (tracks failure rates)

- **Workflows**: DBOS handles resumability on transient failures
  - Step functions throw errors that DBOS captures
  - Workflow logs error and re-throws to signal failure
  - DBOS can resume from last successful step

- **DBOS Initialization**: Retry logic with exponential backoff
  - Up to 3 attempts with delays: 2s, 4s, 8s
  - Logs at each attempt, doesn't crash entire app if DBOS init fails

- **Database Queries**: Use Knex.js error handling
  - Connection failures logged, transaction helpers catch errors
  - Repositories don't hide errors, let them bubble up to API layer

## Cross-Cutting Concerns

**Logging:**
- Approach: Console.log/console.error throughout codebase
- Patterns:
  - `[ClassName]` prefix for context (e.g., `[AgentExecutor]`, `[DBOS]`, `[API]`)
  - DBOS uses `DBOS.logger.info()` and `DBOS.logger.error()` for durable logging
  - Workflow steps log via `DBOS.logger.info()`

**Validation:**
- Approach: API routes validate input before processing
- Patterns:
  - Check required fields: `if (!body.field) { return error }`
  - Use TypeScript interfaces for type checking at build time
  - AgentExecutor validates agent exists and is enabled before execution

**Authentication:**
- Approach: Not implemented yet (placeholder)
- Patterns:
  - API routes accept optional `userId` in request body
  - Sessions track `user_id` for cost attribution
  - No actual authentication middleware, assumes trusted client

**Cost Tracking:**
- Approach: Detailed token tracking at message level, aggregated at session level
- Patterns:
  - ClaudeApiService returns token breakdown (input, output, cache, extended thinking)
  - CostCalculatorService multiplies tokens by model pricing
  - AgentExecutor saves tokens and cost to `agent_messages` and `sessions`
  - Pricing snapshot stored with each message for audit trail

**Agent Health Monitoring:**
- Approach: Passive health tracking based on execution failures
- Patterns:
  - AgentExecutor increments request counts and failure counts
  - Calculates failure rate: `failed_requests / total_requests`
  - Sets status: `healthy` (<20% failures), `degraded` (20-50%), `down` (>50%)
  - Last health check timestamp updated on each execution

---

*Architecture analysis: 2026-02-02*
