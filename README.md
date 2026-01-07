# MyTeacher - Special Education Teacher Portal

A comprehensive web-based portal for special education teachers to manage student records, IEPs, 504 plans, behavior plans, and track student progress.

## Phase 1 Features

- **Authentication**: Google OAuth + Local username/password login
- **Onboarding**: 4-step wizard for role, state, district, and school selection
- **Student Management**: View and manage student records
- **Status Tracking**: Track student status across Overall, Academic, Behavior, and Services scopes
- **Dashboard**: Overview of all assigned students with status badges

## Project Structure

```
myteacher/
├── apps/
│   ├── api/          # Express.js backend (Node.js + TypeScript)
│   └── web/          # Next.js 14 frontend (React + TypeScript)
├── packages/
│   └── db/           # Prisma ORM + PostgreSQL
├── package.json      # Root workspace config
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Prerequisites

- Node.js 18+
- PNPM 8+
- PostgreSQL 14+

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` with your settings:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myteacher"
SESSION_SECRET="your-secure-session-secret-at-least-32-chars"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
FRONTEND_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 4. Run Development Servers

```bash
# Run both frontend and backend
pnpm dev
```

Or run individually:

```bash
pnpm dev:web   # Frontend at http://localhost:3000
pnpm dev:api   # Backend at http://localhost:4000
```

## Default Admin Login

After running the seed script, you can log in with:

- **Username**: `stuadmin`
- **Password**: `stuteacher1125`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Local login (username/password) |
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth callback |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/user/profile` | Update user profile (onboarding) |
| GET | `/api/user/jurisdictions` | Get available jurisdictions |

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List all students |
| GET | `/api/students/:id` | Get student details |
| GET | `/api/students/:id/status` | Get student statuses |
| POST | `/api/students/:id/status` | Create new status |

## Database Schema

### Core Models

- **AppUser**: Teacher/admin accounts with OAuth and local auth support
- **Student**: Student records with personal info and school assignment
- **StudentStatus**: Status tracking (OVERALL, ACADEMIC, BEHAVIOR, SERVICES)
- **Jurisdiction**: State/district hierarchy
- **PlanType**: IEP, 504, Behavior Plan definitions
- **PlanSchema**: Plan templates with field definitions
- **PlanInstance**: Actual student plans
- **PlanFieldValue**: Field data for plan instances

## Rules and Compliance

The application includes an admin-configurable rules system for managing meeting compliance requirements. Rules can be scoped by state, district, or school and apply to specific plan types (IEP, 504, BIP).

### Rule Keys

| Key | Description | Config Fields |
|-----|-------------|---------------|
| `PRE_MEETING_DOCS_DAYS` | Business days before meeting for document delivery | `{ days: number }` |
| `POST_MEETING_DOCS_DAYS` | Business days after meeting for final document delivery | `{ days: number }` |
| `DEFAULT_DELIVERY_METHOD` | Default method for parent document delivery | `{ method: "SEND_HOME" \| "US_MAIL" \| "PICK_UP" }` |
| `US_MAIL_PRE_MEETING_DAYS` | US Mail offset for pre-meeting documents | `{ days: number }` |
| `US_MAIL_POST_MEETING_DAYS` | US Mail offset for post-meeting documents | `{ days: number }` |
| `CONFERENCE_NOTES_REQUIRED` | Require conference notes after meetings | `{ required: boolean }` |
| `INITIAL_IEP_CONSENT_GATE` | Block initial IEP implementation until consent obtained | `{ enabled: boolean }` |
| `CONTINUED_MEETING_NOTICE_DAYS` | Minimum notice days for continued meetings | `{ days: number }` |
| `CONTINUED_MEETING_MUTUAL_AGREEMENT` | Capture mutual agreement for continued meeting dates | `{ required: boolean }` |
| `AUDIO_RECORDING_RULE` | Staff recording required when parent records | `{ staffMustRecordIfParentRecords: boolean, markAsNotOfficialRecord: boolean }` |

### Evidence Types

| Key | Name | Used For |
|-----|------|----------|
| `PARENT_DOCS_SENT` | Pre-Meeting Documents Sent | Confirming pre-meeting document delivery |
| `FINAL_DOC_SENT` | Final Document Sent | Confirming post-meeting document delivery |
| `CONFERENCE_NOTES` | Conference Notes | Required after IEP meetings |
| `CONSENT_FORM` | Parent Consent Form | Required for initial IEP implementation |
| `NOTICE_WAIVER` | Notice Waiver | Required when < 10 days notice for continued meeting |
| `RECORDING_ACK` | Recording Acknowledgment | Required when parent recording occurs |
| `DELIVERY_CONFIRMATION` | Document Delivery Confirmation | Confirming method of delivery |

### Meeting Types

| Code | Name | Description |
|------|------|-------------|
| `INITIAL` | Initial IEP Meeting | First IEP for newly identified student |
| `ANNUAL` | Annual Review | Yearly IEP review |
| `REVIEW` | Review Meeting | Progress review or changes |
| `AMENDMENT` | IEP Amendment | Amendments to current IEP |
| `CONTINUED` | Continued Meeting | Continuation of previous meeting |

### Public API Endpoints (Authenticated Users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rule-packs` | List all rule packs (filter by scope/planType) |
| GET | `/api/rule-packs/active` | Get active rule pack for scope/planType |
| GET | `/api/rule-packs/:id` | Get specific rule pack |
| GET | `/api/rule-packs/definitions` | List all rule definitions |
| GET | `/api/rule-packs/evidence-types` | List all evidence types |
| GET | `/api/rule-packs/meeting-types` | List all meeting types |

### Admin API Endpoints (Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/rule-packs` | List all rule packs with filters |
| GET | `/api/admin/rule-packs/:id` | Get specific rule pack |
| POST | `/api/admin/rule-packs` | Create new rule pack |
| PATCH | `/api/admin/rule-packs/:id` | Update rule pack metadata |
| DELETE | `/api/admin/rule-packs/:id` | Delete rule pack |
| PUT | `/api/admin/rule-packs/:id/rules` | Bulk update rules for pack |
| PUT | `/api/admin/rule-packs/:id/evidence` | Update evidence requirements |
| POST | `/api/admin/rule-packs/:id/rules` | Add single rule to pack |
| PATCH | `/api/admin/rule-packs/:id/rules/:ruleId` | Update single rule |
| DELETE | `/api/admin/rule-packs/:id/rules/:ruleId` | Remove rule from pack |
| GET | `/api/admin/rule-packs/definitions` | List all rule definitions |
| GET | `/api/admin/rule-packs/evidence-types` | List all evidence types |
| GET | `/api/admin/rule-packs/meeting-types` | List all meeting types |

### Admin UI

The admin interface for managing rule packs is available at `/admin/rules`. Features include:

- **Left Panel**: Filterable list of rule packs by scope type, scope ID, plan type, and active status
- **Rule Pack Editor**: Tabbed interface with Overview, Rules, Evidence, and Preview tabs
- **Activation Enforcement**: Only one rule pack can be active per scope+planType combination
- **Scope Hierarchy**: Rules cascade from State → District → School (more specific overrides less specific)

### Meeting Workflow API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings/student/:studentId` | List meetings for a student |
| GET | `/api/meetings/:id` | Get meeting details with enforcement status |
| POST | `/api/meetings` | Create a new meeting |
| PATCH | `/api/meetings/:id` | Update meeting details |
| POST | `/api/meetings/:id/evidence` | Add/update evidence |
| POST | `/api/meetings/:id/mark-held` | Mark meeting as held |
| POST | `/api/meetings/:id/close` | Close meeting (with enforcement) |
| POST | `/api/meetings/:id/cancel` | Cancel meeting |
| POST | `/api/meetings/plans/:planId/implement` | Implement plan (with consent check) |
| POST | `/api/meetings/:id/mark-pre-docs-sent` | Record pre-meeting docs delivery |
| POST | `/api/meetings/:id/mark-post-docs-sent` | Record post-meeting docs delivery |
| POST | `/api/meetings/:id/tasks` | Add action item to meeting |
| PATCH | `/api/meetings/:id/tasks/:taskId` | Update action item |
| DELETE | `/api/meetings/:id/tasks/:taskId` | Remove action item |

### Meeting Workflow States

```
SCHEDULED → HELD → CLOSED
    ↓         ↓
CANCELED   CANCELED
```

### Enforcement Points

Rules are evaluated at specific points:

| Action | Checks Performed |
|--------|------------------|
| Close Meeting | Conference notes, Notice waiver (continued), Mutual agreement, Staff recording |
| Implement Plan | Parent consent (initial IEP), Meeting closed |

## Troubleshooting

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `MISSING_CONFERENCE_NOTES` | Conference notes required but not uploaded | Upload meeting notes via evidence endpoint |
| `MISSING_CONSENT` | Initial IEP requires parent consent | Record consent status or upload consent form |
| `MISSING_NOTICE_WAIVER` | Continued meeting < 10 days notice without waiver | Upload signed waiver or set `noticeWaiverSigned: true` |
| `MISSING_MUTUAL_AGREEMENT` | Continued meeting date agreement not recorded | Set `mutualAgreementForContinuedDate: true` |
| `STAFF_RECORDING_REQUIRED` | Parent is recording but staff is not | Set `staffRecording: true` on the meeting |
| `MEETING_NOT_CLOSED` | Attempting to implement plan before meeting closed | Close the meeting first |
| `ERR_RULE_PACK_NOT_FOUND` | No active rule pack for scope | Create and activate a rule pack |

### Audit Trail

Each closed meeting records which rule pack version was used:

- `rulePackId` - ID of the active rule pack at close time
- `rulePackVersion` - Version number of that pack
- `closedByUserId` - User who closed the meeting
- `closedAt` - Timestamp of closure

### Admin vs Teacher Permissions

| Action | Teacher | Case Manager | Admin |
|--------|---------|--------------|-------|
| View meetings | Own students | Own students | All |
| Create/edit meetings | Own students | Own students | All |
| Close meetings | Yes (with enforcement) | Yes (with enforcement) | Yes |
| View rule packs | Read-only | Read-only | Full CRUD |
| Edit rule packs | No | No | Yes |
| Activate/deactivate rules | No | No | Yes |

For detailed rules documentation, see [docs/rules.md](docs/rules.md).

## Deployment

### Vercel Deployment

The application is deployed to Vercel with separate projects for API and Web:

- **API**: Root directory set to `apps/api`
- **Web**: Root directory set to `apps/web`

### Key Configuration

**vercel.json** (apps/api):
```json
{
  "installCommand": "npm install && prisma generate && prisma migrate deploy && npx tsx prisma/seed-if-empty.ts",
  "builds": [{
    "config": {
      "includeFiles": [
        "prisma/generated/**",
        "prisma/schema.prisma",
        "prisma/migrations/**"
      ]
    }
  }]
}
```

> **Note**: Prisma v7 uses WASM-based query engine, eliminating binary download issues.

### Important Deployment Rules

1. **Always use `migrate deploy`** - Never use `db push` in production
2. **Keep migrations synchronized** - Copy from `packages/db/prisma/migrations` to `apps/api/prisma/migrations` before deploying
3. **Clear Vercel build cache** when debugging Prisma issues (Deployments → Redeploy → Uncheck "Use existing Build Cache")
4. **Check Vercel Function Logs** for actual errors (generic frontend errors often hide database issues)

### Troubleshooting

For detailed deployment troubleshooting including common errors and solutions, see [docs/deployment-troubleshooting.md](docs/deployment-troubleshooting.md).

## Testing

```bash
# Run all tests
pnpm test

# Run API tests
pnpm test:api

# Run frontend tests
pnpm test:web
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6
- **Authentication**: Passport.js (Google OAuth2 + Local)
- **Testing**: Jest, React Testing Library, Supertest

## Prisma Configuration

This project uses **Prisma 6.x** with standard PrismaClient configuration.

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### Key Files

- `apps/api/prisma/schema.prisma` - Database schema
- `apps/api/src/lib/db.ts` - PrismaClient singleton
- `apps/api/prisma/seed.ts` - Database seeding script

## License

Private - All rights reserved
