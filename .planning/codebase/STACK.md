# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code, API routes, services, workflows
- JavaScript (compiled) - Development scripts via tsx and ts-node

**Secondary:**
- SQL - Direct database queries and schema migrations

## Runtime

**Environment:**
- Node.js >= 22.12.0 (see `package.json` engines field and `.nvmrc`)

**Package Manager:**
- npm (npm workspaces compatible)
- Lockfile: `package-lock.json` (committed)

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router framework for API routes and web interface
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering

**State Management:**
- Zustand 5.0.10 - Client-side state management

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processor
- Autoprefixer 10.4.23 - CSS vendor prefixing

**UI Components:**
- Lucide React 0.563.0 - Icon library
- React Markdown 10.1.0 - Markdown rendering component
- Remark GFM 4.0.1 - GitHub Flavored Markdown support

## Workflow & Orchestration

- DBOS SDK 4.7.9 - Durable workflow execution engine (critical dependency)
  - Provides `DBOS.registerWorkflow()`, `DBOS.runStep()`, workflow persistence
  - Uses same PostgreSQL database for workflow state
  - Accessed via `lib/dbos/init.ts` initialization on app startup

## Database

**ORM/Query Builder:**
- Knex.js 3.1.0 - SQL query builder and migration tool
  - Config: `knexfile.ts`
  - Migrations directory: `db/migrations/`
  - Seed directory: `db/seeds/`
  - Used for schema management and complex queries

**Database Client:**
- pg 8.17.2 - PostgreSQL native client (used by Knex)

**Database:**
- PostgreSQL 16 (Alpine image via Docker)
- Connection pooling: min 2, max 10 (dev), max 20 (production)
- SSL support: enabled for remote databases only

## AI Integration

**Anthropic Claude API:**
- @anthropic-ai/sdk 0.32.1 - Official Anthropic Python SDK
  - Models supported: claude-sonnet-4-20250514 (default)
  - Token tracking: input, output, cache creation, cache read, extended thinking
  - Configuration: `ANTHROPIC_API_KEY` environment variable

## Logging & Monitoring

**Logging Framework:**
- Winston 3.19.0 - Structured logging library
  - Usage: Throughout codebase via `console.log`, `console.error`
  - DBOS logger: `DBOS.logger.info()`, `DBOS.logger.error()` in workflow files

**OpenTelemetry (Instrumentation):**
- @opentelemetry/api 1.9.0 - Telemetry API
- @opentelemetry/context-async-hooks 1.30.1 - Async context propagation
- @opentelemetry/core 1.30.1 - Core telemetry
- @opentelemetry/sdk-logs 0.55.0 - Log collection
- @opentelemetry/sdk-trace-base 1.30.1 - Trace collection
- @opentelemetry/exporter-logs-otlp-proto 0.55.0 - Log export
- @opentelemetry/exporter-trace-otlp-proto 0.55.0 - Trace export
- Note: Imported but not actively configured in codebase

## WebSocket Support

- ws 8.19.0 - WebSocket library for real-time communication

## Utilities

- date-fns 4.1.0 - Date utility library
- dotenv 17.2.3 - Environment variable loading

## Development Tools

**Type Checking:**
- TypeScript 5.9.3 - Static type checking

**Linting:**
- ESLint 9.39.2 - JavaScript linter
- eslint-config-next 16.1.6 - Next.js ESLint config

**Code Formatting:**
- Prettier 3.8.1 - Code formatter
- Config: `.prettierrc` (semi: true, trailing comma: es5, single quotes, 80 char width)

**Testing/Scripting:**
- tsx 4.21.0 - TypeScript executor for scripts
- ts-node 10.9.2 - TypeScript execution for Node.js

## Build Configuration

**Compilation:**
- TypeScript 5.9.3 - Targets ES2020
- Next.js built-in bundling (webpack)
- Source maps for debugging

**Next.js Configuration:**
- App Router (default in Next.js 16)
- Instrumentation enabled via `instrumentation.ts`
- Path aliases configured: `@/*` maps to project root

## Configuration Files

**Environment:**
- `.env.local` - Development environment variables (local only, not committed)
- `knexfile.ts` - Knex database configuration with dev/staging/production profiles
- `dbos-config.yaml` - DBOS application configuration
- `.nvmrc` - Node.js version specification (22.12.0)

**Build/Tooling:**
- `tsconfig.json` - TypeScript configuration (ES2020 target, strict mode enabled)
- `.eslintrc.json` - ESLint configuration extending Next.js standards
- `.prettierrc` - Prettier code formatting rules
- `next.config.js` - Next.js configuration (if present)

## Platform Requirements

**Development:**
- Node.js 22.12.0+
- PostgreSQL 16 (can run via Docker)
- Git
- npm package manager

**Production:**
- Node.js 22.12.0+
- PostgreSQL 16 (remote database connection)
- Environment variables configured (ANTHROPIC_API_KEY, DATABASE_URL, DBOS_SYSTEM_DATABASE_URL)

**Docker:**
- Docker & Docker Compose for local PostgreSQL
- Image: `postgres:16-alpine`
- Container name: `dmap-postgres`
- Exposes port 5432

## Key Dependencies Graph

```
Next.js 16.1
├─ React 19.2.4
├─ TypeScript 5.9.3
├─ Tailwind CSS 4.1.18
└─ ESLint + Prettier (dev)

DBOS 4.7.9 (workflows)
├─ PostgreSQL (shared with Knex)
└─ OpenTelemetry (optional monitoring)

Agent Execution Layer
├─ Anthropic SDK (@anthropic-ai/sdk)
├─ Knex 3.1.0 (queries)
├─ Winston 3.19.0 (logging)
└─ pg 8.17.2 (connection)

Frontend
├─ React 19.2.4
├─ Zustand 5.0.10 (state)
├─ Lucide React (icons)
└─ React Markdown (rendering)
```

---

*Stack analysis: 2026-02-02*
