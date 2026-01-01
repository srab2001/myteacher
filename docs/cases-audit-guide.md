# Cases & Audit Log User Guide

This guide covers the dispute case management and audit logging features in MyTeacher.

## Table of Contents

- [Dispute Cases](#dispute-cases)
  - [Accessing Cases](#accessing-cases)
  - [Creating a New Case](#creating-a-new-case)
  - [Managing Case Details](#managing-case-details)
  - [Timeline Events](#timeline-events)
  - [Attachments](#attachments)
- [Audit Log](#audit-log)
  - [Accessing the Audit Log](#accessing-the-audit-log)
  - [Filtering Audit Records](#filtering-audit-records)
  - [Viewing Record Details](#viewing-record-details)
  - [Exporting Audit Data](#exporting-audit-data)
- [Data Schema](#data-schema)

---

## Dispute Cases

The dispute case management system tracks complaints, disputes, and resolution steps for IEP and 504 plans. Access is restricted to **ADMIN** and **CASE_MANAGER** roles only.

### Accessing Cases

1. Navigate to a student's detail page
2. Click **Cases** in the navigation (visible to ADMIN/CASE_MANAGER only)
3. Or access directly via `/students/{studentId}/cases`

### Case Types

| Type | Description |
|------|-------------|
| `SECTION504_COMPLAINT` | 504 Plan related complaints |
| `IEP_DISPUTE` | IEP-related disputes |
| `RECORDS_REQUEST` | Educational records requests |
| `OTHER` | Other case types |

### Case Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Case is newly created and active |
| `IN_REVIEW` | Case is under review |
| `RESOLVED` | Case has been resolved |
| `CLOSED` | Case is closed |

### Creating a New Case

1. Click **New Case** button
2. Fill in required fields:
   - **Type**: Select case type
   - **Related Plan**: (Optional) Link to an existing plan
   - **Intake Date**: Date case was filed
   - **Summary**: Description of the case
3. Click **Create**

### Managing Case Details

From the case detail page (`/students/{studentId}/cases/{caseId}`):

- **Edit**: Update summary, status, resolution summary
- **Export PDF**: Generate PDF export (placeholder)
- View case metadata (owner, intake date, related plan)

### Timeline Events

Track the progression of a case with events:

| Event Type | Description |
|------------|-------------|
| `INTAKE` | Initial intake of the case |
| `MEETING` | Meeting held regarding the case |
| `RESPONSE_SENT` | Response sent to parent/guardian |
| `DOCUMENT_RECEIVED` | Document received from party |
| `RESOLUTION` | Resolution reached |
| `STATUS_CHANGE` | Case status changed |
| `NOTE` | General note added |

**Adding an Event:**
1. Click **Add Event** in the Timeline section
2. Select event type
3. Enter date, summary, and optional details
4. Click **Add Event**

### Attachments

Upload and manage case-related documents in the Attachments section.

---

## Audit Log

The audit log provides an immutable record of sensitive actions performed in the system. Only **ADMIN** users can access audit logs.

### Accessing the Audit Log

1. Navigate to **Admin** area
2. Click **Audit Log** in the sidebar
3. Or access directly via `/admin/audit`

### Audited Actions

| Action Type | Description |
|-------------|-------------|
| `PLAN_VIEWED` | User viewed a plan (deduplicated per session) |
| `PLAN_UPDATED` | User updated plan data |
| `PLAN_FINALIZED` | Plan version was finalized |
| `PDF_EXPORTED` | PDF export was generated |
| `PDF_DOWNLOADED` | User downloaded a PDF export |
| `SIGNATURE_ADDED` | Signature was added to a document |
| `REVIEW_SCHEDULE_CREATED` | Review schedule was created |
| `CASE_VIEWED` | Dispute case was viewed |
| `CASE_EXPORTED` | Dispute case was exported |
| `PERMISSION_DENIED` | Access was denied to a resource |

### Entity Types

| Entity Type | Description |
|-------------|-------------|
| `PLAN` | Plan instance |
| `PLAN_VERSION` | Finalized plan version |
| `PLAN_EXPORT` | PDF export record |
| `STUDENT` | Student record |
| `GOAL` | Goal record |
| `SERVICE` | Service record |
| `REVIEW_SCHEDULE` | Review schedule |
| `COMPLIANCE_TASK` | Compliance task |
| `DISPUTE_CASE` | Dispute case |
| `SIGNATURE_PACKET` | Signature packet |
| `MEETING` | Meeting record |

### Filtering Audit Records

Use filters to narrow down audit records:

- **Date From / Date To**: Date range filter
- **User**: Filter by specific user
- **Student ID**: Filter by student UUID
- **Action**: Filter by action type
- **Entity**: Filter by entity type

Click **Run** to apply filters.

### Viewing Record Details

Click any row in the results table to open the detail drawer showing:

- Timestamp
- User (name, email, role)
- Action and entity details
- Related student and plan (if applicable)
- IP address and user agent
- Additional metadata (JSON)

### Exporting Audit Data

1. Apply desired filters
2. Click **Export CSV**
3. CSV file downloads with columns:
   - Timestamp, User, User Email, Action, Entity Type, Entity ID, Student ID, Plan ID, IP Address, User Agent

**Note**: Export is limited to 10,000 records maximum.

---

## Data Schema

### AuditLog Model

```prisma
model AuditLog {
  id               String          @id @default(uuid())
  actorUserId      String
  actionType       AuditActionType
  entityType       AuditEntityType
  entityId         String
  studentId        String?
  planId           String?
  planVersionId    String?
  timestamp        DateTime        @default(now())
  metadataJson     Json?           @db.JsonB
  ipAddress        String?
  userAgent        String?

  actor            AppUser         @relation(...)

  @@index([timestamp])
  @@index([actorUserId, timestamp])
  @@index([studentId, timestamp])
  @@index([entityType, entityId])
}
```

### DisputeCase Model

```prisma
model DisputeCase {
  id                String            @id @default(uuid())
  caseNumber        String            @unique
  studentId         String
  planInstanceId    String?
  caseType          DisputeCaseType
  status            DisputeCaseStatus @default(OPEN)
  summary           String
  filedDate         DateTime          @default(now())
  externalReference String?
  assignedToUserId  String?
  resolutionSummary String?
  resolvedAt        DateTime?
  resolvedByUserId  String?
  createdByUserId   String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([studentId])
  @@index([status])
  @@index([caseType])
}
```

### DisputeEvent Model

```prisma
model DisputeEvent {
  id               String           @id @default(uuid())
  disputeCaseId    String
  eventType        DisputeEventType
  eventDate        DateTime         @default(now())
  summary          String
  details          String?
  createdByUserId  String
  createdAt        DateTime         @default(now())

  @@index([disputeCaseId])
  @@index([eventType])
  @@index([eventDate])
}
```

---

## API Endpoints

### Dispute Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students/:studentId/disputes` | List disputes for student |
| POST | `/api/students/:studentId/disputes` | Create new dispute |
| GET | `/api/disputes/:caseId` | Get dispute details |
| PATCH | `/api/disputes/:caseId` | Update dispute |
| GET | `/api/disputes/:caseId/events` | List events |
| POST | `/api/disputes/:caseId/events` | Add event |
| GET | `/api/disputes/:caseId/attachments` | List attachments |
| POST | `/api/disputes/:caseId/attachments` | Add attachment |
| GET | `/api/case-types` | List case types |
| GET | `/api/event-types` | List event types |

### Audit Log (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/audit` | List audit logs (paginated) |
| GET | `/api/admin/audit/:id` | Get audit log detail |
| GET | `/api/admin/audit/export` | Export to CSV |
| GET | `/api/admin/audit/action-types` | List action types |
| GET | `/api/admin/audit/entity-types` | List entity types |
| GET | `/api/admin/audit/users` | List users with audit entries |

---

## RBAC Summary

| Feature | TEACHER | CASE_MANAGER | ADMIN |
|---------|---------|--------------|-------|
| View Cases | - | Yes | Yes |
| Create/Edit Cases | - | Yes | Yes |
| Add Case Events | - | Yes | Yes |
| View Audit Log | - | - | Yes |
| Export Audit CSV | - | - | Yes |
