# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
tractor_beam/
├── .claude/                           # Claude Code instructions (external docs)
├── .planning/                         # GSD planning documents
│   └── codebase/                      # Architecture/structure analysis
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       └── CONCERNS.md
├── .next/                             # Next.js build output (generated)
├── app/                               # Next.js App Router
│   ├── api/                           # API routes (backend)
│   │   ├── agents/                    # Agent CRUD and execution
│   │   │   ├── route.ts               # GET/POST agents
│   │   │   └── [id]/                  # Agent by ID
│   │   │       ├── route.ts           # GET/PUT/DELETE agent
│   │   │       ├── execute/           # Execute agent
│   │   │       │   └── route.ts
│   │   │       └── health/            # Agent health status
│   │   │           └── route.ts
│   │   ├── workflows/                 # Workflow orchestration
│   │   │   ├── route.ts               # GET workflows
│   │   │   ├── start/                 # Start workflow
│   │   │   │   └── route.ts
│   │   │   └── [id]/                  # Workflow by ID
│   │   │       ├── route.ts           # GET workflow status
│   │   │       ├── steps/             # Workflow steps
│   │   │       │   └── route.ts
│   │   │       └── cancel/            # Cancel workflow
│   │   │           └── route.ts
│   │   ├── sessions/                  # Session management
│   │   │   ├── route.ts               # GET/POST sessions
│   │   │   └── [id]/                  # Session by ID
│   │   │       ├── route.ts           # GET/DELETE session
│   │   │       ├── messages/          # Conversation history
│   │   │       │   └── route.ts
│   │   │       └── cost/              # Session costs
│   │   │           └── route.ts
│   │   ├── providers/                 # LLM provider management
│   │   │   ├── route.ts               # GET/POST providers
│   │   │   └── [id]/                  # Provider by ID
│   │   │       ├── route.ts           # GET/PUT/DELETE provider
│   │   │       └── set-default/       # Set as default
│   │   │           └── route.ts
│   │   ├── models/                    # LLM model management
│   │   │   ├── route.ts               # GET/POST models
│   │   │   ├── [id]/                  # Model by ID
│   │   │   │   ├── route.ts           # GET/PUT/DELETE model
│   │   │   │   └── usage/             # Model usage stats
│   │   │   │       └── route.ts
│   │   │   └── by-provider/
│   │   │       └── [providerName]/    # Models by provider
│   │   │           └── route.ts
│   │   ├── chat/                      # Chat interface
│   │   │   └── route.ts
│   │   └── health/                    # App health check
│   │       └── route.ts
│   ├── agents/                        # Agent management UI pages
│   │   ├── page.tsx                   # List agents
│   │   └── [id]/                      # Agent detail page
│   │       └── page.tsx
│   ├── workflows/                     # Workflow UI pages
│   │   ├── page.tsx                   # List workflows
│   │   └── [id]/                      # Workflow detail page
│   │       └── page.tsx
│   ├── providers-models/              # Provider/model management UI
│   │   └── page.tsx
│   ├── dashboard/                     # Dashboard UI
│   │   └── page.tsx
│   ├── layout.tsx                     # Root layout (providers, styles)
│   ├── page.tsx                       # Home page
│   └── globals.css                    # Global styles
├── components/                        # Reusable React components
│   ├── agents/                        # Agent-related components
│   │   ├── AgentCreateModal.tsx       # Create agent modal
│   │   ├── AgentEditModal.tsx         # Edit agent modal
│   │   ├── AgentDeleteConfirm.tsx     # Delete confirmation
│   │   └── ModelSelector.tsx          # Model dropdown selector
│   ├── models/                        # Model-related components
│   │   ├── ModelCard.tsx              # Model display card
│   │   ├── ModelCreateModal.tsx       # Create model modal
│   │   ├── ModelEditModal.tsx         # Edit model modal
│   │   └── ModelDeleteModal.tsx       # Delete confirmation
│   ├── ClientWrapper.tsx              # Client-side provider wrapper
│   └── ErrorBoundary.tsx              # Error boundary component
├── lib/                               # Shared library code
│   ├── agents/                        # Agent execution
│   │   ├── AgentExecutor.ts           # Generic agent runner (loads from DB)
│   │   └── index.ts                   # Exports
│   ├── services/                      # Business logic services
│   │   ├── ClaudeApiService.ts        # Anthropic SDK wrapper
│   │   ├── CostCalculatorService.ts   # Token cost calculations
│   │   └── index.ts                   # Exports
│   ├── claude/                        # Claude-specific utilities
│   │   └── api-manager.ts             # API management utilities
│   ├── db/                            # Database access layer
│   │   ├── client.ts                  # Knex.js singleton
│   │   ├── repositories.ts            # Repository pattern (50+ methods)
│   │   ├── types.ts                   # TypeScript interfaces (all 9 tables)
│   │   ├── queries.ts                 # Complex raw SQL queries
│   │   └── index.ts                   # Exports
│   ├── dbos/                          # DBOS workflow orchestration
│   │   ├── init.ts                    # DBOS initialization (registry pattern)
│   │   ├── config.ts                  # DBOS configuration
│   │   ├── index.ts                   # Export workflows and registry
│   │   ├── workflowRegistration.ts    # Safe registration helper
│   │   └── workflows/                 # Workflow definitions
│   │       ├── DocumentToStoriesWorkflow.ts      # Parse doc → stories
│   │       ├── StoryImplementationWorkflow.ts    # Story → code
│   │       ├── CodeReviewWorkflow.ts             # Code review process
│   │       └── PrototypeWorkflow.ts              # Prototype creation
│   ├── hooks/                         # React hooks (client-side)
│   │   ├── useChat.ts                 # Chat session management
│   │   ├── useWorkflow.ts             # Workflow status polling
│   │   ├── useWorkflowSteps.ts        # Workflow steps tracking
│   │   └── usePolling.ts              # Generic polling hook
│   └── utils/                         # Utility functions
│       ├── formatting.ts              # Format functions (date, text)
│       └── validation.ts              # Validation helpers
├── db/                                # Database migrations and seeds
│   ├── migrations/                    # Knex migrations (applied in order)
│   │   ├── 20260129000001_initial_schema.ts      # Core tables (agents, sessions, etc.)
│   │   ├── 20260202000001_provider_model_system.ts # Provider/model split
│   │   ├── 20260202000002_finalize_model_id_migration.ts
│   │   └── 20260202000003_add_api_key_to_providers.ts
│   └── seeds/                         # Database seed files
│       ├── 001_core_agents.ts         # Seeds 19 core agents
│       └── 002_anthropic_models.ts    # Seeds Anthropic models
├── scripts/                           # Utility scripts
├── instrumentation.ts                 # ⚠️ CRITICAL: Next.js entry point (DBOS init)
├── knexfile.ts                        # Knex configuration (migrations config)
├── next.config.ts                     # Next.js configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies and scripts
├── .env.local                         # Environment variables (gitignored)
├── docker-compose.yaml                # PostgreSQL container
├── dbos-config.yaml                   # DBOS configuration
├── CLAUDE.md                          # Project guidelines for Claude
└── README.md                          # Project documentation
```

## Directory Purposes

**`app/api/`:**
- Purpose: RESTful API endpoints for all operations
- Contains: Route handlers (POST, GET, PUT, DELETE)
- Pattern: Each resource (agents, workflows, sessions) has its own subdirectory
- Key files:
  - `app/api/agents/[id]/execute/route.ts`: Executes agent, saves to DB
  - `app/api/workflows/start/route.ts`: Starts workflow in background
  - `app/api/sessions/route.ts`: Create session for tracking costs/history

**`app/` (UI pages):**
- Purpose: Next.js App Router pages (Server Components by default)
- Contains: Page components for public routes
- Pattern: One `.tsx` file per route, dynamic routes use `[param]/`
- Examples:
  - `app/agents/page.tsx`: List all agents
  - `app/workflows/[id]/page.tsx`: Show workflow details/status

**`components/`:**
- Purpose: Reusable React components (Client Components)
- Contains: Modal dialogs, cards, buttons, form controls
- Pattern: Feature-based subdirectories (`agents/`, `models/`)
- Usage: Imported by page components and other components

**`lib/agents/`:**
- Purpose: Agent execution core
- Key: `AgentExecutor.ts` is the generic executor for all agents
- Pattern: Singleton via `getAgentExecutor()`, loads agents from DB at runtime

**`lib/services/`:**
- Purpose: Business logic services
- Key files:
  - `ClaudeApiService.ts`: Wraps Anthropic SDK, handles multiple providers/models
  - `CostCalculatorService.ts`: Calculates costs from token counts and pricing
- Pattern: Object with static or instance methods, exported as singletons

**`lib/db/`:**
- Purpose: Database access layer
- Files:
  - `client.ts`: Knex.js instance for query building
  - `repositories.ts`: High-level data access (findByName, create, update, etc.)
  - `types.ts`: TypeScript interfaces for all 9 database tables
  - `queries.ts`: Complex raw SQL queries
- Pattern: Repository object with async methods, no class instantiation

**`lib/dbos/`:**
- Purpose: DBOS workflow orchestration
- Key:
  - `init.ts`: Initializes DBOS at app startup (handles registration registry)
  - `workflows/`: Each workflow file exports workflow function and starter
- Pattern: Global registry stores workflows, survives Next.js HMR

**`lib/hooks/`:**
- Purpose: React hooks for client-side state management
- Usage: `'use client'` directive in each hook file
- Examples:
  - `useChat.ts`: Manage session and messages
  - `useWorkflow.ts`: Poll workflow status
  - `usePolling.ts`: Generic polling logic

**`db/migrations/`:**
- Purpose: Knex.js migration files (version control for schema)
- Pattern: `YYYYMMDDHHMMSS_description.ts` naming
- Execution: `npm run db:migrate` runs all pending migrations in order

**`db/seeds/`:**
- Purpose: Seed data (core agents, models, providers)
- Execution: `npm run db:seed`
- Examples:
  - `001_core_agents.ts`: Creates 19 agents (Orchestrator, Developer, QA, etc.)
  - `002_anthropic_models.ts`: Creates Anthropic model records

## Key File Locations

**Entry Points:**

| Purpose | File |
|---------|------|
| Server initialization | `instrumentation.ts` |
| Home page | `app/page.tsx` |
| API agents | `app/api/agents/route.ts` |
| Execute agent | `app/api/agents/[id]/execute/route.ts` |
| Workflow start | `app/api/workflows/start/route.ts` |

**Configuration:**

| Purpose | File |
|---------|------|
| Environment variables | `.env.local` (gitignored) |
| DBOS config | `dbos-config.yaml` |
| Knex config | `knexfile.ts` |
| TypeScript | `tsconfig.json` |
| Next.js | `next.config.ts` |
| PostgreSQL Docker | `docker-compose.yaml` |

**Core Logic:**

| Component | File |
|-----------|------|
| Agent executor | `lib/agents/AgentExecutor.ts` |
| Claude API wrapper | `lib/services/ClaudeApiService.ts` |
| Cost calculator | `lib/services/CostCalculatorService.ts` |
| Database client | `lib/db/client.ts` |
| Database repositories | `lib/db/repositories.ts` |
| DBOS initialization | `lib/dbos/init.ts` |
| Workflow registry | `lib/dbos/index.ts` |

**Workflows:**

| Workflow | File |
|----------|------|
| Document to Stories | `lib/dbos/workflows/DocumentToStoriesWorkflow.ts` |
| Story Implementation | `lib/dbos/workflows/StoryImplementationWorkflow.ts` |
| Code Review | `lib/dbos/workflows/CodeReviewWorkflow.ts` |
| Prototype | `lib/dbos/workflows/PrototypeWorkflow.ts` |

**Testing:**

| Purpose | File |
|---------|------|
| Test configuration | `jest.config.js` or `vitest.config.ts` (if exists) |

## Naming Conventions

**Files:**

- **API routes**: `route.ts` for handlers, `[param]/` for dynamic segments
  - Pattern: `app/api/agents/[id]/execute/route.ts`
  - Exports: `GET`, `POST`, `PUT`, `DELETE` async functions

- **React components**: PascalCase with `.tsx` extension
  - Pattern: `AgentCreateModal.tsx`, `ModelCard.tsx`
  - Marker: `'use client'` directive for client components

- **Services**: PascalCaseService.ts
  - Pattern: `ClaudeApiService.ts`, `CostCalculatorService.ts`
  - Exports: Class or singleton object

- **Hooks**: `use` prefix with camelCase
  - Pattern: `useChat.ts`, `useWorkflow.ts`
  - Marker: `'use client'` directive

- **Repositories**: `repoNameRepo` (object, not class)
  - Pattern: `agentDefinitionsRepo`, `modelsRepo`
  - Exports: Object with async methods

- **Migrations**: `YYYYMMDDhhmmss_description.ts`
  - Pattern: `20260129000001_initial_schema.ts`

- **Workflows**: `NameWorkflow.ts`
  - Pattern: `DocumentToStoriesWorkflow.ts`
  - Exports: `workflowFunction`, `workflow`, `startWorkflow`

**Directories:**

- **Feature-based**: Group by domain (agents, workflows, sessions)
  - Pattern: `app/api/agents/`, `components/agents/`
  - Benefit: Easy to find related code

- **Type-based**: Some separation by function (migrations, seeds, hooks)
  - Pattern: `db/migrations/`, `lib/hooks/`

- **Lowercase**: All directory names lowercase
  - Pattern: `lib/agents/`, `components/models/`

## Where to Add New Code

**New Agent:**
- Agent definition: Database seed in `db/seeds/` or API POST `/api/agents`
- No code needed - agents are 100% database-driven
- System prompt stored in `agent_definitions.system_prompt`

**New Workflow:**
1. Create workflow file: `lib/dbos/workflows/MyWorkflow.ts`
   ```typescript
   import { safeRegisterWorkflow } from '../workflowRegistration';

   export const myWorkflow = safeRegisterWorkflow('myWorkflow', workflowFunction);
   export async function startMyWorkflow(input) {
     return await DBOS.startWorkflow(myWorkflow)(input);
   }
   ```
2. Import in `lib/dbos/init.ts`: `const myWf = await import('./workflows/MyWorkflow')`
3. Add to registry in `init.ts`: `myWorkflow: myWf.myWorkflow`
4. Export types from `lib/dbos/index.ts`: `export type { MyWorkflowInput, MyWorkflowOutput }`
5. Add case in `app/api/workflows/start/route.ts`
6. Primary code: `lib/dbos/workflows/MyWorkflow.ts`
7. Tests: `lib/dbos/workflows/__tests__/MyWorkflow.test.ts` (if testing exists)

**New Service:**
1. Create file: `lib/services/MyService.ts`
2. Export singleton or class: `export const myService = { ... }` or `export class MyService { ... }`
3. Export instance getter in `lib/services/index.ts`
4. Use in API routes or other services

**New API Endpoint:**
1. Create route: `app/api/resource/route.ts` (for list/create) or `app/api/resource/[id]/action/route.ts`
2. Export async handler: `export async function GET/POST(request, { params }) { ... }`
3. Call service or repository layer
4. Return NextResponse with consistent shape: `{ success, data/error, count }`

**New UI Page:**
1. Create file: `app/path/page.tsx`
2. Can be Server or Client Component
3. Server Component by default, add `'use client'` if using hooks
4. Import components from `components/`
5. Fetch from API routes via `fetch()` (server) or hooks (client)

**New React Component:**
1. Create file: `components/feature/ComponentName.tsx`
2. Marker: `'use client'` if using hooks/state
3. Exports: React.FC with clear props interface
4. Import in page or other components

**Utilities:**
- Small shared functions: `lib/utils/category.ts`
- Example: `formatting.ts`, `validation.ts`

**Database Migrations:**
1. Create: `npx knex migrate:make migration_name`
2. Edit generated file in `db/migrations/`
3. Add up() and down() functions
4. Run: `npm run db:migrate`

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (automatically by Next.js)
- Committed: No (in .gitignore)
- Clean with: `rm -rf .next` before rebuild

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: By GSD mapper commands
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, TESTING.md, etc.

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (in .gitignore)
- Install with: `npm install`

**`.claude/`:**
- Purpose: External Claude Code instructions
- Generated: Manual
- Committed: Yes
- Contains: Guides for Claude development work

---

*Structure analysis: 2026-02-02*
