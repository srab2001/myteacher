# MyTeacher Application Blueprint

Complete technical documentation of all features, functions, and system architecture.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Routes](#api-routes)
5. [Frontend Pages](#frontend-pages)
6. [Features](#features)
7. [Rules Engine](#rules-engine)
8. [Goal Wizard](#goal-wizard)
9. [Deployment](#deployment)

---

## System Overview

MyTeacher is a special education compliance management platform for IEP, 504, and BIP plan management. The system supports teachers, case managers, and administrators in creating, managing, and tracking student educational plans while ensuring compliance with state regulations (particularly Maryland COMAR).

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Google OAuth, Session-based |
| AI | OpenAI GPT-4 |
| Hosting | Vercel |

### Project Structure

```
myteacher/
├── apps/
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── middleware/   # Auth, validation
│   │   │   ├── services/     # Business logic
│   │   │   └── lib/          # Utilities
│   │   └── prisma/           # Schema copy for deployment
│   └── web/                  # Next.js frontend
│       └── src/
│           ├── app/          # Pages (App Router)
│           ├── components/   # React components
│           └── lib/          # API client, utilities
├── packages/
│   └── db/                   # Shared Prisma schema
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
└── docs/                     # Documentation
```

---

## Architecture

### Authentication Flow

```
User → Google OAuth → /auth/callback → Session Created → Cookie Set
                                            ↓
                             AppUser record created/updated
```

### Authorization Model

| Role | Permissions |
|------|-------------|
| ADMIN | Full access to all features, all students, rule pack management |
| TEACHER | Access to own students, create/edit plans and goals |
| CASE_MANAGER | Same as Teacher with cross-student collaboration |
| RELATED_SERVICE_PROVIDER | Access to assigned students for service logging |
| READ_ONLY | View-only access to assigned students |

### Admin Authorization Pattern

Routes requiring teacher ownership must include admin bypass:

```typescript
const isAdmin = req.user!.role === 'ADMIN';
const resource = await prisma.resource.findFirst({
  where: {
    id: resourceId,
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});
```

---

## Data Models

### Core Entities

| Model | Description |
|-------|-------------|
| AppUser | Users (teachers, admins, service providers) |
| Student | Students with IEP/504/BIP plans |
| PlanInstance | Active student plans |
| PlanSchema | Plan templates defining fields and sections |
| Goal | IEP goals with progress tracking |
| GoalProgress | Daily/weekly progress entries |

### IEP-Specific Models (Maryland COMAR)

| Model | Description |
|-------|-------------|
| IEPService | Special education and related services |
| IEPAccommodation | Testing and classroom accommodations |
| IEPAssessmentDecision | State assessment participation |
| IEPTransition | Secondary transition planning (age 14+) |
| IEPExtendedSchoolYear | ESY eligibility determination |

### Compliance/Rules Models

| Model | Description |
|-------|-------------|
| RulePack | Collection of rules scoped to state/district/school |
| RuleDefinition | Rule templates (e.g., PRE_MEETING_DOCS_DAYS) |
| RulePackRule | Links rules to packs with configuration |
| RuleEvidenceType | Types of evidence (consent forms, notes) |
| PlanMeeting | Meeting scheduling and compliance tracking |
| MeetingEvidence | Evidence collected for meetings |

### Support Models

| Model | Description |
|-------|-------------|
| WorkSample | Student work samples linked to goals |
| ServiceLog | Service delivery tracking |
| BehaviorTarget | Behavior intervention targets |
| BehaviorEvent | Behavior occurrence tracking |
| ArtifactComparison | AI-powered document comparison |

### Review & Compliance Models

| Model | Description |
|-------|-------------|
| ReviewSchedule | Plan review scheduling and notifications |
| ComplianceTask | Compliance action items with assignments |
| InAppAlert | In-app alert notifications |

### Dispute Case Models

| Model | Description |
|-------|-------------|
| DisputeCase | Dispute/complaint case tracking |
| DisputeEvent | Case timeline events |
| DisputeAttachment | Case document attachments |

### Audit Models

| Model | Description |
|-------|-------------|
| AuditLog | Immutable audit trail for sensitive actions |

---

## API Routes

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/google | Initiate Google OAuth |
| GET | /auth/google/callback | OAuth callback |
| GET | /auth/session | Get current session |
| POST | /auth/logout | End session |

### Students (`/api/students`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | List teacher's students |
| GET | /api/students/:id | Get student details |
| POST | /api/students | Create student |
| PATCH | /api/students/:id | Update student |

### Plans (`/api/plans`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans/:planId | Get plan details |
| PATCH | /api/plans/:planId | Update plan |
| POST | /api/students/:id/plans | Create new plan |

### Goals (`/api/goals`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans/:planId/goals | List goals for plan |
| POST | /api/plans/:planId/goals | Create goal |
| PATCH | /api/goals/:goalId | Update goal |
| POST | /api/goals/:goalId/progress/quick | Quick progress entry |
| POST | /api/goals/:goalId/progress/dictation | Dictated progress entry |
| GET | /api/goals/:goalId/progress | Get progress history |

### Goal Wizard (`/api/goal-wizard`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/goal-wizard/session/start | Start AI wizard session |
| POST | /api/goal-wizard/session/:sessionId/message | Send message to wizard |
| POST | /api/goal-wizard/present-levels/generate | Generate present levels |

### Meetings (`/api/meetings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/meetings | List meetings |
| POST | /api/meetings | Schedule meeting |
| PATCH | /api/meetings/:id | Update meeting |
| POST | /api/meetings/:id/close | Close meeting with compliance check |
| POST | /api/meetings/:id/evidence | Add evidence |

### Rules (`/api/rules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rules/context | Resolve rules for student |
| GET | /api/rule-packs/definitions | List rule definitions |
| GET | /api/rule-packs/evidence-types | List evidence types |

### Admin - Rule Packs (`/api/admin/rule-packs`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/rule-packs | List all rule packs |
| POST | /api/admin/rule-packs | Create rule pack |
| GET | /api/admin/rule-packs/:id | Get pack details |
| PATCH | /api/admin/rule-packs/:id | Update pack |
| DELETE | /api/admin/rule-packs/:id | Delete pack |
| POST | /api/admin/rule-packs/:id/rules | Add rule to pack |
| PATCH | /api/admin/rule-packs/:id/rules/:ruleId | Update rule config |
| DELETE | /api/admin/rule-packs/:id/rules/:ruleId | Remove rule |
| POST | /api/admin/rule-packs/:id/rules/:ruleId/evidence | Add evidence requirement |
| POST | /api/admin/rule-packs/definitions | Create rule definition |
| PATCH | /api/admin/rule-packs/definitions/:id | Update rule definition |
| DELETE | /api/admin/rule-packs/definitions/:id | Delete rule definition |
| POST | /api/admin/rule-packs/evidence-types | Create evidence type |
| PATCH | /api/admin/rule-packs/evidence-types/:id | Update evidence type |
| DELETE | /api/admin/rule-packs/evidence-types/:id | Delete evidence type |

### Admin - General (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | List all users |
| GET | /api/admin/users/:id | Get user details |
| PATCH | /api/admin/users/:id | Update user role/permissions |
| GET | /api/admin/students | List all students (cross-teacher) |
| POST | /api/admin/students | Create student (assign teacher) |
| GET | /api/admin/schemas | List plan schemas |
| POST | /api/admin/schemas | Create schema |
| PATCH | /api/admin/schemas/:id | Update schema |
| POST | /api/admin/schemas/:id/fields | Add field to schema |

### Dispute Cases (`/api/disputes`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students/:studentId/disputes | List disputes for student |
| POST | /api/students/:studentId/disputes | Create new dispute case |
| GET | /api/disputes/:caseId | Get dispute case details |
| PATCH | /api/disputes/:caseId | Update dispute case |
| GET | /api/disputes/:caseId/events | List case events |
| POST | /api/disputes/:caseId/events | Add event to case timeline |
| GET | /api/disputes/:caseId/attachments | List attachments |
| POST | /api/disputes/:caseId/attachments | Add attachment |
| GET | /api/case-types | List case types |
| GET | /api/event-types | List event types |

### Audit Log (`/api/admin/audit`) - ADMIN Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/audit | List audit logs (paginated) |
| GET | /api/admin/audit/:id | Get single audit log with details |
| GET | /api/admin/audit/export | Export CSV (max 10,000 records) |
| GET | /api/admin/audit/action-types | List action types for filter |
| GET | /api/admin/audit/entity-types | List entity types for filter |
| GET | /api/admin/audit/users | List users with audit entries |

### Review Schedules (`/api/review-schedules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans/:planId/review-schedules | List schedules for plan |
| POST | /api/plans/:planId/review-schedules | Create review schedule |
| PATCH | /api/review-schedules/:id | Update schedule |
| DELETE | /api/review-schedules/:id | Delete schedule |

### Compliance Tasks (`/api/compliance-tasks`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/compliance-tasks | List tasks (optionally by user) |
| POST | /api/compliance-tasks | Create task |
| PATCH | /api/compliance-tasks/:id | Update task |
| DELETE | /api/compliance-tasks/:id | Delete task |

### In-App Alerts (`/api/alerts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | Get user's alerts (unread or all) |
| PATCH | /api/alerts/:id/read | Mark alert as read |
| PATCH | /api/alerts/read-all | Mark all alerts as read |

### Services (`/api/services`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans/:planId/services | List services for plan |
| POST | /api/plans/:planId/services | Log service delivery |

### Behavior (`/api/behavior`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans/:planId/behavior | Get behavior plan |
| POST | /api/plans/:planId/behavior/targets | Add behavior target |
| POST | /api/behavior/targets/:id/events | Record behavior event |

### Artifact Compare (`/api/artifact-compare`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/artifact-compare/upload | Upload documents for comparison |
| POST | /api/artifact-compare/:id/analyze | Run AI comparison |
| GET | /api/artifact-compare/:id | Get comparison results |

---

## Frontend Pages

### Public Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with login |
| `/auth/callback` | OAuth callback handler |
| `/change-password` | Password change (local auth) |

### Teacher Pages

| Path | Description |
|------|-------------|
| `/dashboard` | Teacher dashboard with student list |
| `/onboarding` | New user onboarding |
| `/students/[id]` | Student profile and plans |
| `/students/[id]/plans/[planId]/iep` | IEP editor |
| `/students/[id]/plans/[planId]/504` | 504 plan editor |
| `/students/[id]/plans/[planId]/goals` | Goals management |
| `/students/[id]/plans/[planId]/services` | Service logging |
| `/students/[id]/plans/[planId]/behavior` | Behavior plan |
| `/students/[id]/plans/[planId]/behavior/targets` | Behavior targets |
| `/students/[id]/plans/[planId]/behavior/data` | Behavior data entry |
| `/students/[id]/plans/[planId]/print` | Print-ready plan view |
| `/students/[id]/reports` | Student reports |
| `/students/[id]/iep-report/new` | Create IEP report |

### Admin Pages

| Path | Description |
|------|-------------|
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/users/[userId]` | User details/edit |
| `/admin/students` | All students management |
| `/admin/schools` | School management |
| `/admin/schemas` | Plan schema management |
| `/admin/schemas/[id]` | Schema editor |
| `/admin/form-fields` | Form field definitions |
| `/admin/rules` | Rule packs management |
| `/admin/rules/wizard` | Rule setup wizard |
| `/admin/documents/best-practice` | Best practice documents |
| `/admin/documents/templates` | Form templates |
| `/admin/audit` | Audit log viewer |
| `/admin/versions` | Version & Signature Dashboard |

### Case Manager/Admin Pages

| Path | Description |
|------|-------------|
| `/students/[id]/cases` | Dispute cases list |
| `/students/[id]/cases/[caseId]` | Case detail with timeline |
| `/students/[id]/referrals` | Student referrals |
| `/students/[id]/evaluation-cases` | Evaluation cases |

---

## Features

### 1. Student Management

- Create and manage student profiles
- Assign students to teachers
- Track student status (on-track, watch, concern, urgent)
- View student history across plans

### 2. Plan Management

**IEP Plans:**
- Maryland COMAR-compliant IEP structure
- Section-based editing with field validation
- Present levels of academic achievement
- Annual goals with short-term objectives
- Services and accommodations
- Transition planning (age 14+)
- Extended School Year (ESY) determination
- Assessment decisions

**504 Plans:**
- Disability documentation
- Accommodations tracking
- Review scheduling

**Behavior Plans (BIP):**
- Behavior target definition
- Multiple measurement types (frequency, duration, interval, rating)
- Data collection and analysis

### 3. Goal Wizard

AI-powered goal creation assistant:

1. **Present Levels Analysis** - Uploads artifacts, generates present levels
2. **Goal Area Selection** - Choose from 10 goal areas
3. **AI Chat Interface** - Conversational goal drafting
4. **COMAR Alignment** - Maryland standards compliance checking
5. **Review & Save** - Edit and finalize goals

### 4. Progress Tracking

- Quick-select progress levels (Not Addressed → Met Target)
- Dictation support for detailed notes
- Work sample uploads with ratings
- Progress history visualization

### 5. Service Logging

- Track service delivery minutes
- Multiple service types (Speech, OT, PT, Counseling, etc.)
- Multiple settings (Gen Ed, SPED, Resource Room, etc.)
- Provider attribution

### 6. Artifact Comparison

AI-powered document comparison:
- Upload baseline and comparison documents
- Automatic text extraction
- AI analysis of changes and growth
- Link comparisons to goals

### 7. Meeting Management

- Schedule meetings (Initial, Annual, Review, Amendment, Continued)
- Track document delivery compliance
- Recording acknowledgments
- Evidence collection
- Meeting closure with compliance gates

### 8. Compliance Reporting (Looker Integration)

SQL queries for compliance reporting:
- Goals missing weekly progress reports
- Teacher compliance summaries
- School compliance summaries
- Progress entry trends
- Students requiring immediate attention
- Goal area compliance breakdown

### 9. Dispute Case Management

Track and manage disputes, complaints, and resolution processes:

**Case Types:**
- SECTION504_COMPLAINT - 504 Plan related complaints
- IEP_DISPUTE - IEP-related disputes
- RECORDS_REQUEST - Educational records requests
- OTHER - Other case types

**Case Statuses:**
- OPEN - Newly created and active
- IN_REVIEW - Under review
- RESOLVED - Resolution reached
- CLOSED - Case closed

**Timeline Events:**
- INTAKE - Initial intake
- MEETING - Meeting held
- RESPONSE_SENT - Response to parent/guardian
- DOCUMENT_RECEIVED - Document received
- RESOLUTION - Resolution reached
- STATUS_CHANGE - Status changed
- NOTE - General note

**Access Control:** ADMIN and CASE_MANAGER roles only.

### 10. Audit Log System

Immutable audit trail for sensitive actions:

**Audited Actions:**
| Action Type | Description |
|-------------|-------------|
| PLAN_VIEWED | User viewed a plan (session-deduplicated) |
| PLAN_UPDATED | User updated plan data |
| PLAN_FINALIZED | Plan version was finalized |
| PDF_EXPORTED | PDF export generated |
| PDF_DOWNLOADED | PDF export downloaded |
| SIGNATURE_ADDED | Signature added to document |
| REVIEW_SCHEDULE_CREATED | Review schedule created |
| CASE_VIEWED | Dispute case viewed |
| CASE_EXPORTED | Dispute case exported |
| PERMISSION_DENIED | Access denied |

**Entity Types:** PLAN, PLAN_VERSION, PLAN_EXPORT, STUDENT, GOAL, SERVICE, REVIEW_SCHEDULE, COMPLIANCE_TASK, DISPUTE_CASE, SIGNATURE_PACKET, MEETING

**Features:**
- Filter by date range, user, student, action type, entity type
- CSV export (max 10,000 records)
- Detail drawer with metadata, IP address, user agent
- Session-based deduplication for PLAN_VIEWED

**Access Control:** ADMIN only.

### 11. Review Scheduling

Schedule and track plan reviews:
- Create review schedules with specific dates
- Track review completion
- Automated notifications via alerts
- Link to compliance tasks

### 12. Compliance Tasks

Track compliance action items:
- Create tasks with due dates
- Assign to users
- Track status (pending, in_progress, completed)
- Link to students and plans
- Priority levels

### 13. In-App Alerts

Notification system for important events:
- Unread alert count (bell icon)
- Mark as read/unread
- Alert types: REVIEW_DUE, COMPLIANCE_OVERDUE, CASE_UPDATE, MEETING_REMINDER
- User-specific targeting

---

## Rules Engine

### Overview

The rules engine enforces compliance requirements based on jurisdiction (state/district/school) and plan type.

### Scope Precedence

```
SCHOOL > DISTRICT > STATE
```

More specific scopes override general scopes.

### Built-in Rules

| Rule Key | Description | Default Config |
|----------|-------------|----------------|
| PRE_MEETING_DOCS_DAYS | Business days before meeting for draft delivery | 5 days |
| POST_MEETING_DOCS_DAYS | Business days after meeting for final delivery | 5 days |
| US_MAIL_PRE_MEETING_DAYS | Extra days for US Mail pre-meeting | 3 days |
| US_MAIL_POST_MEETING_DAYS | Extra days for US Mail post-meeting | 3 days |
| CONFERENCE_NOTES_REQUIRED | Require notes before closing | true |
| INITIAL_IEP_CONSENT_GATE | Block implementation without consent | true |
| CONTINUED_MEETING_NOTICE_DAYS | Minimum notice for continued meetings | 10 days |
| CONTINUED_MEETING_MUTUAL_AGREEMENT | Require agreement documentation | true |
| AUDIO_RECORDING_RULE | Staff records if parent records | true |

### Evidence Types

| Key | Description |
|-----|-------------|
| CONFERENCE_NOTES | Meeting conference notes |
| PARENT_CONSENT | Parent consent form |
| NOTICE_WAIVER | Notice waiver for continued meetings |
| RECORDING_ACKNOWLEDGMENT | Recording acknowledgment form |
| PRE_MEETING_DOCS_SENT | Confirmation of pre-meeting docs delivery |
| POST_MEETING_DOCS_SENT | Confirmation of post-meeting docs delivery |

### Rule Resolution Flow

```
1. Get student's school, district, state
2. Search for active pack: SCHOOL → DISTRICT → STATE
3. Return first match (or null if none found)
4. Merge rule configs with defaults
5. Return resolved rules context
```

### Rules Setup Wizard

Admin tool at `/admin/rules/wizard` for creating:
1. New rule definitions (templates)
2. New evidence types
3. New rule packs with configuration

---

## Goal Wizard

### Session Flow

```
1. Teacher selects goal area (Reading, Math, etc.)
2. Optionally uploads artifacts for present levels
3. AI generates present levels analysis
4. Teacher starts chat session
5. AI guides goal creation conversationally
6. AI provides COMAR-aligned goal draft
7. Teacher reviews and edits
8. Save as draft or final
```

### API Flow

```
POST /api/goal-wizard/present-levels/generate
  → Upload artifacts, get AI-generated present levels

POST /api/goal-wizard/session/start
  → Create session with planId, area, artifacts, presentLevels
  → Returns sessionId and initial AI message

POST /api/goal-wizard/session/:sessionId/message
  → Send user message
  → Returns AI response and currentDraft (if any)
```

### Present Levels Structure

```typescript
interface PresentLevels {
  currentPerformance: string;
  challengesNoted: string[];
  strengthsNoted: string[];
  impactOnEducation: string;
}
```

---

## Deployment

### Vercel Configuration

**API Project (apps/api):**
```json
{
  "builds": [{
    "src": "api/index.ts",
    "use": "@vercel/node",
    "config": {
      "includeFiles": [
        "prisma/generated/**",
        "prisma/schema.prisma",
        "prisma/migrations/**"
      ]
    }
  }],
  "installCommand": "npm install && npx prisma generate && npx prisma migrate deploy"
}
```

**Web Project (apps/web):**
- Standard Next.js deployment
- Uses rewrites to proxy `/api/*` to API project

### Environment Variables

**API:**
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `SESSION_SECRET` - Express session secret
- `OPENAI_API_KEY` - OpenAI API key
- `FRONTEND_URL` - Web app URL

**Web:**
- `API_URL` - Server-side API URL (for rewrites)
- `NEXT_PUBLIC_API_URL` - Client-side API URL (dev only)

### Migration Sync

Keep migrations synchronized:
```bash
cp -r packages/db/prisma/migrations apps/api/prisma/
```

---

## Key Patterns

### 1. Admin Authorization Bypass

All routes checking teacher ownership need admin bypass:

```typescript
const isAdmin = req.user!.role === 'ADMIN';
const plan = await prisma.planInstance.findFirst({
  where: {
    id: planId,
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});
```

### 2. Section Detection for Special UI

Goals sections can be detected multiple ways:

```typescript
const isGoalsSection =
  section.isGoalsSection ||
  section.key === 'goals' ||
  section.fields?.some(f => f.type === 'goals');
```

### 3. Async State Timing

When using async operations with React state, return values directly:

```typescript
const startSession = async (): Promise<string | null> => {
  const result = await api.startSession();
  setSessionId(result.sessionId);
  return result.sessionId; // Return directly, don't rely on state
};

// Usage
const currentSessionId = sessionId || await startSession();
```

### 4. Next.js API Rewrites

Use server-side `API_URL` for rewrites to avoid CORS issues:

```javascript
// next.config.js
const apiUrl = process.env.API_URL || 'http://localhost:4000';
return [{
  source: '/api/:path*',
  destination: `${apiUrl}/api/:path*`,
}];
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12 | Initial release |
| 1.1 | 2024-12 | Rules engine, Goal wizard |
| 1.2 | 2024-12 | Rules setup wizard, Looker integration |
| 1.3 | 2024-12 | Review scheduling, Compliance tasks, In-app alerts |
| 1.4 | 2024-12 | Dispute cases, Audit log system |
