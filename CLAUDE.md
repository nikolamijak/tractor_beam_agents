# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tractor Beam** is a Next.js application that provides an AI agent orchestration system for SDLC management. The system uses DBOS for durable workflow execution and dynamically loads AI agent definitions from PostgreSQL.

### Tech Stack

- **Framework**: Next.js 16.1 (App Router)
- **Runtime**: Node.js >=22.12.0
- **Language**: TypeScript 5.9+
- **Database**: PostgreSQL 16
- **ORM/Query Builder**: Knex.js
- **Workflow Engine**: DBOS SDK 4.7+
- **AI Provider**: Anthropic Claude API (@anthropic-ai/sdk)
- **Styling**: Tailwind CSS 4.1
- **State Management**: Zustand

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run dev:turbo        # Start with turbo mode

# Database Operations
npm run db:migrate       # Run Knex migrations
npm run db:rollback      # Rollback Knex migrations
npm run db:seed          # Seed core agents (19 agents)

# DBOS Operations
npm run dbos:migrate     # Run DBOS migrations
npm run dbos:rollback    # Rollback DBOS migrations

# Database Setup (Docker)
docker-compose up -d     # Start PostgreSQL container
npm run db:setup         # Initialize database

# Type Checking & Linting
npm run type-check       # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier

# Testing & Verification
npm run test:agent-system   # Test agent execution
npm run verify:dbos         # Verify DBOS setup

# Build & Production
npm run build            # Build for production
npm start                # Start production server
```

## Architecture Overview

### Critical Pattern: DBOS Initialization Order

**DBOS initialization happens at application startup via Next.js instrumentation:**

1. `instrumentation.ts` runs when Next.js server starts
2. Calls `initializeDBOS()` from `lib/dbos/init.ts`
3. DBOS is configured → workflows imported & registered → DBOS launched
4. Workflows stored in global registry (survives HMR)
5. API routes import from registry, NOT from workflow files directly

**IMPORTANT**: This prevents duplicate workflow registration errors. API routes must use `getWorkflowStarters()` to access workflows.

### Data-Driven Agent System

**Agent definitions are 100% database-driven**. No hard-coded agents in TypeScript.

- Agent system prompts stored in `agent_definitions.system_prompt` column
- All agent properties (model, temperature, tokens, tools) configurable in DB
- `AgentExecutor` loads agent config from DB at runtime
- New agents can be added via API without code changes

**Agent Execution Flow:**

```
1. API route receives request → AgentExecutor.execute(agentName, input, context)
2. AgentExecutor loads agent from DB (with system prompt)
3. Builds message array (optionally includes conversation history)
4. Calls Claude API with DB-stored system prompt
5. Saves conversation to agent_messages table
6. Updates agent health metrics
7. Returns parsed response
```

### Database Schema Split

**Two separate schema domains:**

1. **Our Schema** (`db/migrations/`) - Agent system tables:
   - `agent_definitions` - Agent configs & prompts
   - `agent_health` - Health metrics
   - `sessions` - User sessions
   - `agent_messages` - Conversation history
   - `stories` - User stories (ACF-XXX format)
   - `artifacts` - Generated code/configs
   - `technology_extensions` - Tech stack plugins

2. **DBOS Schema** (managed by DBOS SDK) - Workflow state:
   - `dbos_workflows` - Workflow execution tracking
   - `dbos_workflow_steps` - Step-level state
   - `dbos_workflow_state` - Durable state storage
   - (DBOS SDK creates & manages these automatically)

### DBOS Workflow Pattern

**Preferred pattern**: Use `DBOS.registerWorkflow()` and `DBOS.runStep()` (NOT decorators)

```typescript
// Step functions (async functions that do real work)
async function stepFunction(params) {
  // Can call external APIs, DB, agents, etc.
  return result;
}

// Workflow function (orchestrates steps)
async function workflowFunction(input) {
  const result1 = await DBOS.runStep(() => stepFunction(input), { name: 'step1' });
  const result2 = await DBOS.runStep(() => anotherStep(result1), { name: 'step2' });
  return { result1, result2 };
}

// Register workflow
export const myWorkflow = DBOS.registerWorkflow(workflowFunction);

// Start in background
export async function startMyWorkflow(input) {
  return await DBOS.startWorkflow(myWorkflow)(input);
}
```

**Key constraints:**
- Workflow functions must be deterministic (no `Date.now()`, `Math.random()` directly in workflow)
- Non-deterministic operations go inside steps (wrapped in `DBOS.runStep()`)
- All inputs/outputs must be JSON serializable
- Use `Promise.allSettled()` not `Promise.all()` for parallel steps
- Use `DBOS.logger.error()` for logging (not console.error)

See `.claude/instructions/dbos-instructions.md` for comprehensive DBOS patterns.

## Project Structure

```
tractor_beam/
├── app/                           # Next.js App Router
│   ├── api/                       # API Routes
│   │   ├── agents/                # Agent CRUD & execution
│   │   ├── workflows/             # Workflow start/status
│   │   ├── sessions/              # Session management
│   │   └── chat/                  # Chat interface
│   ├── agents/                    # Agent management UI
│   ├── workflows/                 # Workflow visualization UI
│   └── dashboard/                 # Dashboard UI
│
├── lib/
│   ├── agents/
│   │   └── AgentExecutor.ts       # Generic agent runner (loads from DB)
│   ├── dbos/
│   │   ├── init.ts                # DBOS initialization & workflow registry
│   │   ├── config.ts              # DBOS configuration
│   │   └── workflows/             # Workflow definitions
│   │       ├── DocumentToStoriesWorkflow.ts
│   │       ├── StoryImplementationWorkflow.ts
│   │       ├── CodeReviewWorkflow.ts
│   │       └── PrototypeWorkflow.ts
│   ├── services/
│   │   └── ClaudeApiService.ts    # Anthropic API wrapper
│   ├── db/
│   │   ├── client.ts              # Knex client
│   │   ├── repositories.ts        # DB access layer
│   │   ├── types.ts               # DB table types
│   │   └── queries.ts             # Raw SQL queries
│   └── hooks/                     # React hooks
│       ├── useChat.ts
│       ├── useWorkflow.ts
│       └── useWorkflowSteps.ts
│
├── db/
│   ├── migrations/
│   │   └── 20260129000001_initial_schema.ts
│   └── seeds/
│       └── 001_core_agents.ts     # Seeds 19 core agents
│
├── components/                    # React components
│   ├── agents/
│   ├── workflows/
│   └── ui/
│
├── instrumentation.ts             # ⚠️ CRITICAL: DBOS init entry point
├── knexfile.ts                    # Knex configuration
├── dbos-config.yaml               # DBOS configuration
└── docker-compose.yaml            # PostgreSQL container
```

## Critical Files

### `instrumentation.ts`
Next.js instrumentation that runs on server startup. Calls `initializeDBOS()` before any API routes load.

### `lib/dbos/init.ts`
DBOS initialization logic with workflow registry. Ensures workflows are registered once and reused. Uses global state to survive Next.js HMR.

### `lib/agents/AgentExecutor.ts`
Generic agent executor. Loads agent definitions from database (including system prompts) and executes via Claude API. Works with ALL agents - no hard-coded logic.

### `lib/dbos/workflows/*.ts`
Workflow definitions using DBOS patterns. Each workflow exports:
- `workflowFunction` - The workflow logic
- `workflow` - Registered workflow (via `DBOS.registerWorkflow()`)
- `startWorkflow` - Background execution wrapper

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://dmap_user:dmap_dev_password@localhost:5432/dmap
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dmap
DB_USER=dmap_user
DB_PASSWORD=dmap_dev_password

# DBOS (uses same database)
DBOS_SYSTEM_DATABASE_URL=postgresql://dmap_user:dmap_dev_password@localhost:5432/dmap
DBOS_APP_NAME=dmap

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Key Concepts

### Dynamic Agent Registration

Agents can be added via API without code changes:

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "custom-agent",
    "displayName": "Custom Agent",
    "category": "utility",
    "systemPrompt": "Your agent system prompt here...",
    "model": "claude-sonnet-4-20250514"
  }'
```

The agent is immediately available for execution via `AgentExecutor.execute('custom-agent', ...)`.

### Workflow Registry Pattern

**IMPORTANT**: Workflows use safe registration to prevent duplicate registration errors in production builds.

**WRONG** (causes duplicate registration):
```typescript
// ❌ Don't do this in API routes
import { documentToStoriesWorkflow } from '@/lib/dbos/workflows/DocumentToStoriesWorkflow';
```

**CORRECT**:
```typescript
// ✅ Import from registry
import { getWorkflowStarters } from '@/lib/dbos';
const { startDocumentToStoriesWorkflow } = getWorkflowStarters();
```

**Safe Registration Pattern**:
All workflows must use `safeRegisterWorkflow()` instead of direct `DBOS.registerWorkflow()` to prevent duplicate registration when Next.js imports modules multiple times in production builds.

```typescript
import { safeRegisterWorkflow } from '../workflowRegistration';

export const myWorkflow = safeRegisterWorkflow(
  'myWorkflow',  // unique name
  myWorkflowFunction
);
```

### Agent Categories

- **workflow** (8 agents): Orchestrator, Intake, Ideation, ProductOwner, Developer, QA, DevOps, Summarizer
- **innovation** (5 agents): Prototype, PoC, Pilot, ProductStrategy, Product
- **utility** (6 agents): CodeReviewer, Security, SecurityAuditor, TestGenerator, ScrumMaster, FileParser
- **technology** (future): .NET, Node.js, Python, Java, Go specific agents

All core agents are seeded via `npm run db:seed`.

## API Endpoints

```
GET    /api/agents                      # List agents (filter by category/tech)
POST   /api/agents                      # Register new agent
GET    /api/agents/[id]                 # Get agent details
PUT    /api/agents/[id]                 # Update agent (including system prompt)
DELETE /api/agents/[id]                 # Delete agent
POST   /api/agents/[id]/execute         # Execute agent with input
GET    /api/agents/[id]/health          # Agent health status

GET    /api/workflows                   # List available workflows
POST   /api/workflows/start             # Start workflow (returns handle)
GET    /api/workflows/[id]              # Get workflow status
GET    /api/workflows/[id]/steps        # Get workflow steps
POST   /api/workflows/[id]/cancel       # Cancel running workflow

GET    /api/sessions                    # List sessions
POST   /api/sessions                    # Create session
GET    /api/sessions/[id]/messages      # Conversation history
```

## Common Patterns

### Adding a New Workflow

1. Create workflow file in `lib/dbos/workflows/MyWorkflow.ts`
2. **IMPORTANT**: Use `safeRegisterWorkflow()` pattern (NOT direct `DBOS.registerWorkflow()`):
   ```typescript
   import { safeRegisterWorkflow } from '../workflowRegistration';

   export const myWorkflow = safeRegisterWorkflow(
     'myWorkflow',  // unique name
     myWorkflowFunction
   );
   ```
3. Export workflow and starter function
4. Import in `lib/dbos/init.ts` and add to registry
5. Add route case in `app/api/workflows/start/route.ts`
6. Create types in workflow file, re-export from `lib/dbos/index.ts`

See existing workflows for complete examples.

### Adding a New Agent (via DB)

Agents are added via database, not code. Use the API endpoint or seed file.

### Database Migrations

```bash
# Create migration
npx knex migrate:make migration_name

# Run migrations
npm run db:migrate

# Rollback
npm run db:rollback
```

## TypeScript Path Aliases

- `@/*` maps to project root
- Example: `import { getAgentExecutor } from '@/lib/agents'`

## Node Version

This project requires Node.js **>=22.12.0** (see `.nvmrc` and `package.json` engines field).

```bash
nvm use  # If using nvm
```

## Docker PostgreSQL

The project includes a Docker Compose configuration for PostgreSQL:

```bash
docker-compose up -d        # Start database
docker-compose down         # Stop database
docker-compose logs -f      # View logs
```

Database runs on `localhost:5432` with credentials in `.env.local`.
