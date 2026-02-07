# Tractor Beam

**AI-Powered SDLC Orchestration Through Specialized Agent Collaboration**

---

## Overview

Tractor Beam is an enterprise-grade AI agent orchestration system that automates and augments software development lifecycle (SDLC) processes. The platform uses 19 specialized AI agents working in coordinated, durable workflows to transform requirements into deliverable software.

### Key Features

- **19 Specialized AI Agents**: Workflow, innovation, and utility agents for every SDLC phase
- **Durable Workflows**: Fault-tolerant multi-step processes using DBOS SDK
- **100% Data-Driven**: Add and configure agents without code changes
- **Full Traceability**: Complete audit trail of all AI interactions
- **Technology Agnostic**: Extensible framework supporting multiple tech stacks

### Use Cases

- **Requirements to Stories**: Convert documents to prioritized user stories in minutes
- **Story Implementation**: Generate code, tests, and deployment configs automatically
- **Code Review**: Multi-perspective automated review (quality, security, testing)
- **Rapid Prototyping**: Idea to MVP in hours

---

## Quick Start

### Prerequisites

- **Node.js**: >=22.12.0 (see `.nvmrc`)
- **Docker**: For PostgreSQL (or use external PostgreSQL instance)
- **Anthropic API Key**: Get from [Anthropic Console](https://console.anthropic.com/)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd tractor_beam

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your configuration (DB credentials, Anthropic API key)

# Start PostgreSQL
docker-compose up -d

# Initialize database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Essential Commands

```bash
# Development
npm run dev                      # Start Next.js dev server
npm run build                    # Build for production
npm start                        # Start production server

# Database Operations
docker-compose up -d             # Start PostgreSQL
npm run db:migrate               # Run Knex migrations
npm run db:rollback              # Rollback migrations
npm run db:seed                  # Seed 19 core agents

# Code Quality
npm run type-check               # TypeScript checking
npm run lint                     # ESLint
npm run format                   # Prettier formatting

# Testing
npm run test:agent-system        # Test agent execution
npm run verify:dbos              # Verify DBOS setup
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 16.1 |
| **Runtime** | Node.js | ≥22.12.0 |
| **Language** | TypeScript | 5.9+ |
| **Database** | PostgreSQL | 16 |
| **Query Builder** | Knex.js | 3.2.0 |
| **Workflow Engine** | DBOS SDK | 4.7+ |
| **AI Provider** | Anthropic Claude | claude-sonnet-4 |
| **Styling** | Tailwind CSS | 4.1 |

---

## Architecture Highlights

### Data-Driven Agent System

All agent definitions (including system prompts) are stored in PostgreSQL. Add new agents via API without code changes:

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "custom-agent",
    "displayName": "Custom Agent",
    "systemPrompt": "You are...",
    "model": "claude-sonnet-4-20250514"
  }'
```

### Durable Workflows

Workflows automatically resume from the last completed step if interrupted:

```typescript
// Workflow survives crashes and restarts
const handle = await startDocumentToStoriesWorkflow({
  documentContent: "Requirements...",
  technology: "nodejs"
});

// Check status
const status = await DBOS.getWorkflowStatus(handle.workflowID);
```

### Core Workflows

1. **DocumentToStories**: Requirements → Prioritized user stories
2. **StoryImplementation**: User story → Code + Tests + Deployment
3. **CodeReview**: Code → Quality + Security + Test reports
4. **Prototype**: Idea → MVP implementation

---

## Project Structure

```
tractor_beam/
├── app/                         # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── agents/              # Agent management
│   │   ├── workflows/           # Workflow orchestration
│   │   └── sessions/            # Session management
│   ├── dashboard/               # Dashboard UI
│   └── agents/                  # Agent management UI
│
├── lib/
│   ├── dbos/                    # DBOS workflows & config
│   │   ├── init.ts              # Initialization & registry
│   │   └── workflows/           # Workflow definitions
│   ├── agents/                  # Agent execution engine
│   ├── services/                # External service integrations
│   └── db/                      # Database access layer
│
├── db/
│   ├── migrations/              # Database migrations
│   └── seeds/                   # Initial data (19 core agents)
│
├── docs/                        # 📚 **Comprehensive Documentation**
│   ├── TECHNICAL_ARCHITECTURE.md  # Deep technical docs
│   ├── SYSTEM_DESIGN.md           # High-level system design
│   ├── QUICK_REFERENCE.md         # Cheat sheet & recipes
│   ├── ADR_LOG.md                 # Architecture decisions
│   ├── DIAGRAMS.md                # Visual diagrams
│   ├── INDEX.md                   # Glossary & index
│   └── README.md                  # Documentation guide
│
├── instrumentation.ts           # DBOS initialization entry point
├── knexfile.ts                  # Database configuration
└── docker-compose.yaml          # PostgreSQL container
```

---

## 📚 Documentation

**Comprehensive technical documentation is available in the `docs/` folder:**

### For New Developers

1. **[Quick Reference Guide](docs/QUICK_REFERENCE.md)** - Essential commands and patterns
2. **[System Design](docs/SYSTEM_DESIGN.md)** - Understand what the system does
3. **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - Learn how it works
4. **[ADR Log](docs/ADR_LOG.md)** - Key architectural decisions

### For Product Managers

- **[System Design](docs/SYSTEM_DESIGN.md)** - Business context, use cases, and roadmap

### For Architects & Leadership

- **[ADR Log](docs/ADR_LOG.md)** - Architecture decisions and trade-offs
- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - Technical constraints

### Quick Links

- **[Documentation Index](docs/INDEX.md)** - Glossary and comprehensive index
- **[Diagrams](docs/DIAGRAMS.md)** - Visual architecture diagrams
- **[Documentation Guide](docs/README.md)** - How to navigate docs

---

## Environment Variables

Create `.env.local` with:

```bash
# Database
DATABASE_URL=postgresql://dmap_user:password@localhost:5432/dmap
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dmap
DB_USER=dmap_user
DB_PASSWORD=dmap_dev_password

# DBOS (uses same database)
DBOS_SYSTEM_DATABASE_URL=postgresql://dmap_user:password@localhost:5432/dmap
DBOS_APP_NAME=dmap

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## API Endpoints

### Agent Management

```
GET    /api/agents                   # List agents
POST   /api/agents                   # Create agent
GET    /api/agents/[id]              # Get agent
PUT    /api/agents/[id]              # Update agent
DELETE /api/agents/[id]              # Delete agent
POST   /api/agents/[id]/execute      # Execute agent
GET    /api/agents/[id]/health       # Health status
```

### Workflow Management

```
GET    /api/workflows                # List workflows
POST   /api/workflows/start          # Start workflow
GET    /api/workflows/[id]           # Get status
GET    /api/workflows/[id]/steps     # Get steps
POST   /api/workflows/[id]/cancel    # Cancel workflow
```

See [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md#api-architecture) for detailed API documentation.

---

## Development Guidelines

### Adding a New Agent

Agents are 100% database-driven. Add via API:

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "docs-writer",
    "displayName": "Documentation Writer",
    "category": "utility",
    "systemPrompt": "You are an expert technical writer...",
    "model": "claude-sonnet-4-20250514"
  }'
```

Agent is immediately available for execution.

### Adding a New Workflow

See [Quick Reference - Add a New Workflow](docs/QUICK_REFERENCE.md#add-a-new-workflow) for step-by-step guide.

### Database Migrations

```bash
# Create migration
npx knex migrate:make migration_name

# Run migrations
npm run db:migrate

# Rollback
npm run db:rollback
```

---

## Troubleshooting

### "Workflow already registered" Error

**Cause**: API route importing workflow directly instead of from registry

**Fix**: Use workflow registry pattern
```typescript
// ❌ WRONG
import { workflow } from '@/lib/dbos/workflows/MyWorkflow';

// ✅ CORRECT
import { getWorkflowStarters } from '@/lib/dbos';
const { startMyWorkflow } = getWorkflowStarters();
```

### "Agent not found" Error

**Fix**: Reseed database
```bash
npm run db:seed
```

### More Troubleshooting

See [Quick Reference - Troubleshooting](docs/QUICK_REFERENCE.md#troubleshooting) for common issues.

---

## Testing

```bash
# Test agent execution
npm run test:agent-system

# Verify DBOS setup
npm run verify:dbos

# Run all tests (future)
npm test
```

---

## Deployment

### Production Build

```bash
# Build
npm run build

# Start production server
npm start
```

### Docker Deployment (Future)

See [Technical Architecture - Deployment Architecture](docs/TECHNICAL_ARCHITECTURE.md#deployment-architecture) for Kubernetes deployment guide.

---

## Roadmap

### ✅ Q1 2026 - Foundation (Complete)

- Core platform architecture
- 19 specialized agents
- 4 core workflows
- DBOS durable execution
- Next.js web interface

### 🚧 Q2 2026 - Production Readiness

- Authentication & authorization (JWT + RBAC)
- API rate limiting
- Monitoring and alerting
- Kubernetes deployment
- CI/CD pipeline

### 📅 Q3 2026 - Integrations

- GitHub integration (PR automation)
- Jira/Azure DevOps integration
- Slack notifications
- Webhook support

### 📅 Q4 2026 - Enterprise Features

- Multi-tenant support
- SSO (SAML, OAuth)
- Custom agent creation UI
- Analytics dashboard

See [System Design - Roadmap](docs/SYSTEM_DESIGN.md#roadmap) for detailed timeline.

---

## Contributing

1. Read [Development Guidelines](docs/TECHNICAL_ARCHITECTURE.md#development-guidelines)
2. Check [Code Review Checklist](docs/TECHNICAL_ARCHITECTURE.md#code-review-checklist)
3. Follow [Git Workflow](docs/TECHNICAL_ARCHITECTURE.md#git-workflow--branch-strategy)
4. Update [documentation](docs/) for architectural changes

---

## License

[To be determined]

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues (link TBD)
- **Contact**: architecture@dmap.dev

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React meta-framework
- [DBOS SDK](https://docs.dbos.dev/) - Durable workflow engine
- [Anthropic Claude](https://www.anthropic.com/) - AI reasoning
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Knex.js](https://knexjs.org/) - Query builder
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Made with ❤️ by the Tractor Beam Team**
