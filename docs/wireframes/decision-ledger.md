# Decision Ledger Module Wireframe

## Overview
The Decision Ledger provides a comprehensive audit trail of all significant actions and decisions made within the IEP/504/BIP workflow. It creates an immutable record for compliance and legal purposes.

## Data Model

```
DecisionLedgerEntry
├── id (uuid)
├── studentId (FK → Student)
├── planInstanceId (FK → PlanInstance, optional)
├── referralId (FK → Referral, optional)
├── eligibilityId (FK → EligibilityDetermination, optional)
├── documentVersionId (FK → DocumentVersion, optional)
├── meetingId (FK → PlanMeeting, optional)
├──
├── // Action Details
├── actionType (enum - see below)
├── actionCategory (REFERRAL | ELIGIBILITY | PLAN | MEETING | DOCUMENT | SIGNATURE | COMPLIANCE)
├── actionDescription (text - human-readable)
├── actionData (json - structured data about the action)
├──
├── // Before/After for changes
├── previousValue (json, optional)
├── newValue (json, optional)
├──
├── // Compliance tracking
├── complianceRule (string - which rule triggered this, if any)
├── complianceDueDate (datetime, optional)
├── complianceStatus (ON_TIME | LATE | PENDING | NA)
├──
├── // Actor info
├── performedByUserId (FK → AppUser)
├── performedByRole (string - role at time of action)
├── performedAt (datetime)
├──
├── // Context
├── ipAddress (string, optional)
├── userAgent (string, optional)
├── sessionId (string, optional)
├──
├── createdAt (datetime - same as performedAt, immutable)
└── // No updatedAt - entries are immutable
```

## Action Types

```typescript
enum DecisionActionType {
  // Referral Actions
  REFERRAL_CREATED = 'REFERRAL_CREATED',
  REFERRAL_SUBMITTED = 'REFERRAL_SUBMITTED',
  REFERRAL_STATUS_CHANGED = 'REFERRAL_STATUS_CHANGED',
  REFERRAL_ASSIGNED = 'REFERRAL_ASSIGNED',
  REFERRAL_DOCUMENT_UPLOADED = 'REFERRAL_DOCUMENT_UPLOADED',
  REFERRAL_CONSENT_OBTAINED = 'REFERRAL_CONSENT_OBTAINED',
  REFERRAL_CONSENT_REFUSED = 'REFERRAL_CONSENT_REFUSED',
  REFERRAL_WITHDRAWN = 'REFERRAL_WITHDRAWN',

  // Eligibility Actions
  ELIGIBILITY_CREATED = 'ELIGIBILITY_CREATED',
  ELIGIBILITY_MEETING_SCHEDULED = 'ELIGIBILITY_MEETING_SCHEDULED',
  ELIGIBILITY_DETERMINATION_MADE = 'ELIGIBILITY_DETERMINATION_MADE',
  ELIGIBILITY_FINALIZED = 'ELIGIBILITY_FINALIZED',
  ELIGIBILITY_PARENT_RESPONSE = 'ELIGIBILITY_PARENT_RESPONSE',

  // Plan Actions
  PLAN_CREATED = 'PLAN_CREATED',
  PLAN_SECTION_UPDATED = 'PLAN_SECTION_UPDATED',
  PLAN_GOAL_ADDED = 'PLAN_GOAL_ADDED',
  PLAN_GOAL_UPDATED = 'PLAN_GOAL_UPDATED',
  PLAN_GOAL_REMOVED = 'PLAN_GOAL_REMOVED',
  PLAN_SERVICE_ADDED = 'PLAN_SERVICE_ADDED',
  PLAN_SERVICE_UPDATED = 'PLAN_SERVICE_UPDATED',
  PLAN_SERVICE_REMOVED = 'PLAN_SERVICE_REMOVED',
  PLAN_STATUS_CHANGED = 'PLAN_STATUS_CHANGED',

  // Document Actions
  DOCUMENT_VERSION_CREATED = 'DOCUMENT_VERSION_CREATED',
  DOCUMENT_FINALIZED = 'DOCUMENT_FINALIZED',
  DOCUMENT_PDF_GENERATED = 'DOCUMENT_PDF_GENERATED',
  DOCUMENT_EXPORTED = 'DOCUMENT_EXPORTED',

  // Meeting Actions
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_RESCHEDULED = 'MEETING_RESCHEDULED',
  MEETING_HELD = 'MEETING_HELD',
  MEETING_CLOSED = 'MEETING_CLOSED',
  MEETING_CANCELLED = 'MEETING_CANCELLED',
  MEETING_EVIDENCE_ADDED = 'MEETING_EVIDENCE_ADDED',

  // Signature Actions
  SIGNATURE_REQUESTED = 'SIGNATURE_REQUESTED',
  SIGNATURE_OBTAINED = 'SIGNATURE_OBTAINED',
  SIGNATURE_DECLINED = 'SIGNATURE_DECLINED',
  SIGNATURE_REMINDER_SENT = 'SIGNATURE_REMINDER_SENT',

  // Compliance Actions
  COMPLIANCE_DEADLINE_APPROACHING = 'COMPLIANCE_DEADLINE_APPROACHING',
  COMPLIANCE_DEADLINE_MISSED = 'COMPLIANCE_DEADLINE_MISSED',
  COMPLIANCE_REQUIREMENT_MET = 'COMPLIANCE_REQUIREMENT_MET',
}
```

## Page Layout - Decision Ledger View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [← Back to Student]    Student: John Doe    Grade: 5                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DECISION LEDGER                                                            │
│  ═══════════════                                                            │
│                                                                             │
│  Complete audit trail of all actions and decisions                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FILTERS                                                                    │
│  ───────                                                                    │
│  Category: [All ▼]  Action: [All ▼]  Date Range: [Last 30 Days ▼]          │
│  Plan: [All Plans ▼]  User: [All Users ▼]                    [Apply]       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 📋 RECENT ACTIVITY                                       [Export CSV]│    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                     │    │
│  │ ● 02/15/2025 2:34 PM                                                │    │
│  │   DOCUMENT_FINALIZED                                    [DOCUMENT]  │    │
│  │   IEP version 4 finalized and PDF generated                         │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │ ● 02/15/2025 2:30 PM                                                │    │
│  │   PLAN_SERVICE_ADDED                                        [PLAN]  │    │
│  │   Added Speech Therapy service (30 min, 2x weekly)                  │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   [View Details] [View Changes]                                     │    │
│  │                                                                     │    │
│  │ ● 02/15/2025 2:25 PM                                                │    │
│  │   PLAN_GOAL_UPDATED                                         [PLAN]  │    │
│  │   Updated Reading Goal - increased target from 100 to 120 wpm       │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   [View Details] [View Changes]                                     │    │
│  │                                                                     │    │
│  │ ● 02/10/2025 10:15 AM                                               │    │
│  │   MEETING_CLOSED                                          [MEETING] │    │
│  │   Amendment meeting closed - all compliance requirements met        │    │
│  │   By: Mr. Brown (Principal)                                         │    │
│  │   Compliance: ✓ ON_TIME                                             │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │ ● 02/01/2025 9:00 AM                                                │    │
│  │   MEETING_SCHEDULED                                       [MEETING] │    │
│  │   Amendment meeting scheduled for 02/10/2025                        │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │ ● 01/25/2025 3:00 PM                                                │    │
│  │   ELIGIBILITY_FINALIZED                                [ELIGIBILITY]│    │
│  │   Student determined eligible for SLD (Reading)                     │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   Compliance: ✓ ON_TIME (within 60-day timeline)                    │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │ ● 01/20/2025 11:00 AM                                               │    │
│  │   REFERRAL_CONSENT_OBTAINED                              [REFERRAL] │    │
│  │   Parent consent for evaluation obtained                            │    │
│  │   By: Ms. Smith (Case Manager)                                      │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │ ● 01/15/2025 9:30 AM                                                │    │
│  │   REFERRAL_SUBMITTED                                     [REFERRAL] │    │
│  │   Initial referral submitted for review                             │    │
│  │   By: Mr. Johnson (Teacher)                                         │    │
│  │   [View Details]                                                    │    │
│  │                                                                     │    │
│  │                                            [Load More]              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Entry Detail Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DECISION LEDGER ENTRY DETAIL                                     [X Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Action: PLAN_GOAL_UPDATED                                                  │
│  Category: PLAN                                                             │
│  Date/Time: 02/15/2025 2:25:34 PM EST                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DESCRIPTION                                                                │
│  ───────────                                                                │
│  Updated Reading Goal - increased target from 100 to 120 wpm                │
│                                                                             │
│  PERFORMED BY                                                               │
│  ────────────                                                               │
│  User: Ms. Smith                                                            │
│  Role: Case Manager                                                         │
│  Email: smith@school.edu                                                    │
│                                                                             │
│  RELATED RECORDS                                                            │
│  ───────────────                                                            │
│  Student: John Doe                                                          │
│  Plan: IEP 2024-2025 [View]                                                 │
│  Document Version: v4 [View]                                                │
│                                                                             │
│  CHANGES                                                                    │
│  ───────                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PREVIOUS VALUE                                                      │    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ {                                                               │ │    │
│  │ │   "goalCode": "R1.1",                                           │ │    │
│  │ │   "area": "READING",                                            │ │    │
│  │ │   "annualGoalText": "Student will read 100 words per minute..." │ │    │
│  │ │ }                                                               │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                     │    │
│  │ NEW VALUE                                                           │    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ {                                                               │ │    │
│  │ │   "goalCode": "R1.1",                                           │ │    │
│  │ │   "area": "READING",                                            │ │    │
│  │ │   "annualGoalText": "Student will read 120 words per minute..." │ │    │
│  │ │ }                                                               │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  COMPLIANCE                                                                 │
│  ──────────                                                                 │
│  Rule: N/A                                                                  │
│  Status: N/A                                                                │
│                                                                             │
│  SESSION INFO                                                               │
│  ────────────                                                               │
│  Session ID: sess_abc123...                                                 │
│  IP Address: 192.168.1.100                                                  │
│  User Agent: Mozilla/5.0 (Macintosh...)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Compliance Timeline View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMPLIANCE TIMELINE                                                        │
│  ═══════════════════                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  REFERRAL → EVALUATION → ELIGIBILITY → IEP                          │    │
│  │                                                                     │    │
│  │  01/15 ─────────────────────────────────────────────────────► 03/21 │    │
│  │    │                                                            │   │    │
│  │    │ Referral    Consent    Eval Due    Meeting    IEP Due      │   │    │
│  │    │ Submitted   Obtained   03/21       01/25      02/24        │   │    │
│  │    ●───────────●──────────────│─────────●──────────│            │   │    │
│  │  01/15       01/20            │       01/25        │            │   │    │
│  │                               │                    │            │   │    │
│  │                           ✓ ON TIME           ✓ ON TIME         │   │    │
│  │                                                                     │    │
│  │  Legend: ● Completed   ○ Pending   ✗ Missed   ─ Timeline           │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students/:studentId/decision-ledger | List entries for student |
| GET | /api/plans/:planId/decision-ledger | List entries for plan |
| GET | /api/decision-ledger/:id | Get entry details |
| GET | /api/decision-ledger/export | Export entries as CSV |
| POST | /api/decision-ledger | Create entry (internal use) |

Note: Decision ledger entries are created automatically by other modules. Direct creation is for system use only.

## Business Rules

1. Entries are IMMUTABLE - never updated or deleted
2. All significant actions across modules must create ledger entries
3. Previous/new values captured for all data changes
4. Compliance status calculated automatically based on due dates
5. System actions (e.g., reminders) also logged
6. Entries include full context (user, session, IP)
7. Export available for compliance audits
8. Entries linked to related records for navigation
