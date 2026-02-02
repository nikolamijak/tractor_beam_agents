# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Anthropic Claude API:**
- Service: Large Language Model for agent execution
  - What it's used for: Agent inference, conversation processing, code generation
  - SDK/Client: `@anthropic-ai/sdk` 0.32.1
  - Auth: Environment variable `ANTHROPIC_API_KEY` (sk-ant-... format)
  - Implementation: `lib/services/ClaudeApiService.ts`
  - Models supported:
    - Default: `claude-sonnet-4-20250514`
    - Configurable per agent in database
  - Features used:
    - Messages API (streaming capable but not used in current implementation)
    - Tool calling support (structure present in agent definition)
    - Token usage tracking (input, output, cache creation, cache read, extended thinking)
    - Cost calculation per request

## Data Storage

**Databases:**
- PostgreSQL 16 (primary)
  - Connection: Via `DATABASE_URL` environment variable or individual components (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
  - Client: Knex.js 3.1.0 (query builder) + pg 8.17.2 (native driver)
  - Schemas:
    - **App Schema** (Knex-managed migrations in `db/migrations/`):
      - `agent_definitions` - Agent configs, system prompts, model assignments
      - `agent_health` - Health metrics and failure tracking
      - `sessions` - User sessions and conversation contexts
      - `agent_messages` - Conversation history with token/cost tracking
      - `stories` - User stories (ACF-XXX format)
      - `artifacts` - Generated code/configs
      - `technology_extensions` - Tech stack plugins
      - `providers` - AI provider configurations (multi-provider support)
      - `models` - Model definitions with pricing
    - **DBOS Schema** (SDK-managed):
      - `dbos_workflows` - Workflow execution tracking
      - `dbos_workflow_steps` - Step-level state
      - `dbos_workflow_state` - Durable state storage

**File Storage:**
- Local filesystem only (no external storage service)
- Artifacts stored as JSON in database `artifacts` table

**Caching:**
- Prompt caching via Anthropic API (cost tracked separately)
- In-memory state: DBOS workflow registry uses global state to survive Next.js HMR

## Authentication & Identity

**Auth Provider:**
- Custom implementation
  - Sessions managed in database (`sessions` table)
  - Session-based context for agent execution
  - User identification: user_id field in session creation
  - No external OAuth/OIDC integration currently
  - Multi-provider support structure exists in database (`providers` table)

**API Key Management:**
- ANTHROPIC_API_KEY: Single environment variable for Anthropic API
- Provider-specific API keys: Stored in `providers` table (column: `api_key`)
- Fallback chain:
  1. Provider-specific API key from database
  2. Environment variable ANTHROPIC_API_KEY
  3. Error if neither available

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, or similar)
- Error handling via try-catch blocks and logging

**Logs:**
- Console-based logging (console.log, console.error)
- Winston 3.19.0 imported but basic usage observed
- DBOS logging: `DBOS.logger.info()`, `DBOS.logger.error()` in workflows
- OpenTelemetry dependencies present but not actively configured

**Health Checks:**
- Endpoint: `GET /api/health` - Application health status
- Agent health tracking: `agent_health` table tracks:
  - Total requests
  - Failed requests
  - Status (healthy/degraded/down)

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase (deployment-agnostic)
- Compatible with Vercel, self-hosted Node servers, containers

**CI Pipeline:**
- No CI configuration files detected (.github/workflows, .gitlab-ci.yml, etc.)
- Available test commands:
  - `npm run test:agent-system` - Test agent execution (tsx scripts/test-agent-system.ts)
  - `npm run verify:dbos` - Verify DBOS setup (node scripts/verify-dbos-setup.js)

**Docker Support:**
- PostgreSQL via Docker Compose (database only, not the app)
- Next.js can be containerized (no Dockerfile present)

## Environment Configuration

**Required Environment Variables:**

Development (`.env.local`):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dmap
DB_USER=dmap_user
DB_PASSWORD=dmap_dev_password
DATABASE_URL=postgresql://dmap_user:dmap_dev_password@localhost:5432/dmap
ANTHROPIC_API_KEY=sk-ant-...
DBOS_SYSTEM_DATABASE_URL=postgresql://dmap_user:dmap_dev_password@localhost:5432/dmap
DBOS_APP_NAME=dmap
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Production:
```
DATABASE_URL=postgresql://...           # Remote database URL
ANTHROPIC_API_KEY=sk-ant-...           # Anthropic API key
DBOS_SYSTEM_DATABASE_URL=postgresql://... # Same as DATABASE_URL
DBOS_APP_NAME=dmap                      # Application name
NEXT_PUBLIC_APP_URL=https://...         # Public URL
NODE_ENV=production
```

**Secrets Location:**
- `.env.local` file (local development only, not committed)
- Environment variables in deployment platform
- Database credentials in environment variables
- API keys in environment variables

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected in current implementation

**Outgoing Webhooks:**
- None detected in current implementation

**WebSocket Support:**
- ws 8.19.0 library imported (for real-time communication capability)
- Not actively used in current codebase (no socket endpoints detected)

## Provider Configuration Pattern

**Multi-Provider Support Structure:**

Database table `providers` stores:
- `provider_name`: Identifier (e.g., 'anthropic')
- `provider_type`: Type identifier
- `api_base_url`: Custom endpoint (optional)
- `auth_type`: Authentication method
- `api_key`: Provider-specific API key
- `is_active`: Enable/disable flag
- `is_default`: Default provider selection
- `supports_streaming`: Capability flag
- `supports_function_calling`: Tool call capability
- `supports_vision`: Vision model capability
- `configuration`: JSONB for additional settings
- `metadata`: JSONB for extensibility

Current provider: Anthropic (hardcoded as default in service initialization)

## Model Configuration Pattern

**Dynamic Model Registration:**

Database table `models` stores:
- `model_name`: Model identifier (e.g., 'claude-sonnet-4-20250514')
- `provider_id`: Reference to providers table
- `pricing`: JSONB with cost structure:
  - `input_per_mtok`: Input token cost per million tokens
  - `output_per_mtok`: Output token cost per million tokens
  - `cache_creation_per_mtok`: Prompt cache creation cost
  - `cache_read_per_mtok`: Prompt cache read cost
  - `context_pricing_tiers`: Array of tiered pricing for context windows
- `max_context_tokens`: Context window size
- `supports_vision`: Vision capability
- `supports_function_calling`: Tool call capability
- `training_data_cutoff`: Knowledge cutoff date

Agent definitions reference models by `model_id` for flexible assignment.

## Agent Configuration Pattern

**Agent Definition Storage:**

Database table `agent_definitions` stores complete agent configuration:
- `agent_name`: Unique identifier
- `display_name`: Human-readable name
- `category`: Agent classification (workflow, innovation, utility, technology)
- `system_prompt`: Custom system prompt (loaded at runtime)
- `model_id`: Reference to models table for dynamic model selection
- `temperature`: LLM parameter (0-1)
- `max_tokens`: Token limit for responses
- `tools`: JSONB array of tool definitions for function calling
- `is_enabled`: Enable/disable agents dynamically
- `metadata`: JSONB for extensibility

**Agent Execution Flow:**
1. API receives request → `POST /api/agents/[id]/execute`
2. AgentExecutor loads agent config from database (including system prompt)
3. AgentExecutor loads model info and provider API key
4. Builds message array (optionally with conversation history from `agent_messages` table)
5. Calls Claude API with database-stored system prompt and provider API key
6. Saves conversation to `agent_messages` table with detailed token tracking
7. Updates `sessions` table with cost aggregates
8. Updates `agent_health` metrics
9. Returns parsed response

## Cost Tracking & Billing

**Token Tracking:**
- Detailed tracking per message in `agent_messages` table:
  - `input_tokens`, `output_tokens`
  - `cache_creation_tokens`, `cache_read_tokens`
  - `extended_thinking_tokens`
  - `tokens_used` (total)
  - `total_cost_usd` (calculated)

**Cost Calculation:**
- Service: `lib/services/CostCalculatorService.ts`
- Pricing tiers support for context window discounts
- Cache savings calculation
- Per-request and per-session aggregation

**Usage Tracking:**
- Session-level aggregation in `sessions` table
- Agent-level metrics in `agent_health` table
- Queryable via `GET /api/models/[id]/usage`

---

*Integration audit: 2026-02-02*
