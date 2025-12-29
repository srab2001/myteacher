# Rules Schema

This document describes the database schema for the compliance rules system.

## Table of Contents

- [Entity Relationship](#entity-relationship)
- [Tables](#tables)
- [Rule Keys](#rule-keys)
- [Evidence Types](#evidence-types)
- [Indexes](#indexes)

## Entity Relationship

```
RuleDefinition (1) ────────── (*) RulePackRule
                                      │
                                      │
RulePack (1) ─────────────────── (*) RulePackRule (1) ───── (*) RulePackEvidenceRequirement
                                                                        │
                                                                        │
RuleEvidenceType (1) ─────────────────────────────────────────── (*) ───┘
                          │
MeetingType (1) ─────────────────── (*) PlanMeeting
                                            │
                                            │ (1)
Student (1) ─────────────────────────── (*) │
                                            │
                                            ├── (*) MeetingEvidence
                                            │           │
                                            │           └── (*) RuleEvidenceType
                                            │
                                            └── (*) MeetingTask
```

## Tables

### RuleDefinition

Global definitions for compliance rules that can be enabled in rule packs.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | VARCHAR(100) | Unique rule identifier (e.g., `PRE_MEETING_DOCS_DAYS`) |
| name | VARCHAR(255) | Human-readable name |
| description | TEXT | Detailed description |
| defaultConfig | JSONB | Default configuration values |
| createdAt | TIMESTAMP | Creation timestamp |

### RuleEvidenceType

Types of evidence that can be collected for meetings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | VARCHAR(100) | Unique evidence identifier (e.g., `CONFERENCE_NOTES`) |
| name | VARCHAR(255) | Human-readable name |
| description | TEXT | Detailed description |
| createdAt | TIMESTAMP | Creation timestamp |

### RulePack

Groups of rules scoped to a jurisdiction level.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| scopeType | ENUM | `STATE`, `DISTRICT`, or `SCHOOL` |
| scopeId | VARCHAR(100) | Reference ID (state code, district ID, or school ID) |
| planType | ENUM | `IEP`, `PLAN504`, `BIP`, or `ALL` |
| name | VARCHAR(255) | Pack name |
| version | INTEGER | Version number (auto-incremented per scope+planType) |
| isActive | BOOLEAN | Whether this pack is active |
| effectiveFrom | TIMESTAMP | Start of effective period |
| effectiveTo | TIMESTAMP | End of effective period (nullable) |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Constraint:** Only one pack can be active per `(scopeType, scopeId, planType)` combination.

### RulePackRule

Junction table linking rules to packs with configuration overrides.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rulePackId | UUID | Foreign key to RulePack |
| ruleDefinitionId | UUID | Foreign key to RuleDefinition |
| isEnabled | BOOLEAN | Whether rule is enabled in this pack |
| config | JSONB | Configuration overrides (merged with defaults) |
| sortOrder | INTEGER | Display order |
| createdAt | TIMESTAMP | Creation timestamp |

### RulePackEvidenceRequirement

Evidence requirements for specific rules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rulePackRuleId | UUID | Foreign key to RulePackRule |
| evidenceTypeId | UUID | Foreign key to RuleEvidenceType |
| isRequired | BOOLEAN | Whether evidence is required |
| createdAt | TIMESTAMP | Creation timestamp |

### MeetingType

Reference table for IEP meeting types.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | ENUM | `INITIAL`, `ANNUAL`, `REVIEW`, `AMENDMENT`, `CONTINUED` |
| name | VARCHAR(255) | Display name |
| description | TEXT | Description |
| createdAt | TIMESTAMP | Creation timestamp |

### PlanMeeting

Individual meeting records for students.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studentId | UUID | Foreign key to Student |
| planInstanceId | UUID | Foreign key to PlanInstance (nullable for initial) |
| planType | ENUM | `IEP`, `PLAN504`, `BIP` |
| meetingTypeId | UUID | Foreign key to MeetingType |
| scheduledAt | TIMESTAMP | Scheduled date/time |
| heldAt | TIMESTAMP | Actual meeting date/time (nullable) |
| closedAt | TIMESTAMP | When meeting was closed (nullable) |
| status | ENUM | `SCHEDULED`, `HELD`, `CLOSED`, `CANCELED` |
| isContinued | BOOLEAN | Whether this is a continued meeting |
| continuedFromMeetingId | UUID | Reference to previous meeting (nullable) |
| parentDeliveryMethod | ENUM | `SEND_HOME`, `US_MAIL`, `PICK_UP` |
| preDocsDeliveredAt | TIMESTAMP | Pre-meeting docs delivery date |
| preDocsDeliveryMethod | ENUM | Delivery method for pre-docs |
| postDocsDeliveredAt | TIMESTAMP | Post-meeting docs delivery date |
| postDocsDeliveryMethod | ENUM | Delivery method for post-docs |
| consentObtainedAt | TIMESTAMP | When consent was obtained |
| consentStatus | VARCHAR | `PENDING`, `OBTAINED`, `REFUSED` |
| mutualAgreementForContinuedDate | BOOLEAN | For continued meetings |
| noticeWaiverSigned | BOOLEAN | If < 10 days notice for continued |
| parentRecording | BOOLEAN | Is parent recording |
| staffRecording | BOOLEAN | Is staff recording |
| outcomeNotes | TEXT | Meeting notes |
| actionItems | JSONB | List of action items |
| rulePackId | VARCHAR | Audit: rule pack used at close |
| rulePackVersion | INTEGER | Audit: rule pack version |
| closedByUserId | UUID | Audit: who closed the meeting |
| createdByUserId | UUID | Who created the meeting |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

### MeetingEvidence

Evidence attached to meetings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| meetingId | UUID | Foreign key to PlanMeeting |
| evidenceTypeId | UUID | Foreign key to RuleEvidenceType |
| fileUploadId | UUID | Optional file attachment |
| note | TEXT | Text note or description |
| evidenceDate | TIMESTAMP | When evidence was collected |
| deliveryMethod | ENUM | For delivery evidence |
| createdAt | TIMESTAMP | Creation timestamp |
| createdByUserId | UUID | Who added the evidence |

**Constraint:** Unique on `(meetingId, evidenceTypeId)`.

### MeetingTask

Action items from meetings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| meetingId | UUID | Foreign key to PlanMeeting |
| title | VARCHAR(255) | Task title |
| description | TEXT | Task details |
| assignedTo | VARCHAR | Assignee name/role |
| dueDate | TIMESTAMP | Due date |
| isCompleted | BOOLEAN | Completion status |
| completedAt | TIMESTAMP | When completed |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

## Rule Keys

| Key | Description | Config Schema |
|-----|-------------|---------------|
| `PRE_MEETING_DOCS_DAYS` | Business days before meeting for draft delivery | `{ days: number }` |
| `POST_MEETING_DOCS_DAYS` | Business days after meeting for final delivery | `{ days: number }` |
| `DEFAULT_DELIVERY_METHOD` | Default document delivery method | `{ method: "SEND_HOME" \| "US_MAIL" \| "PICK_UP" }` |
| `US_MAIL_PRE_MEETING_DAYS` | Extra days for US Mail pre-meeting delivery | `{ days: number }` |
| `US_MAIL_POST_MEETING_DAYS` | Extra days for US Mail post-meeting delivery | `{ days: number }` |
| `CONFERENCE_NOTES_REQUIRED` | Require conference notes before close | `{ required: boolean }` |
| `INITIAL_IEP_CONSENT_GATE` | Block initial IEP implementation without consent | `{ enabled: boolean }` |
| `CONTINUED_MEETING_NOTICE_DAYS` | Minimum notice for continued meetings | `{ days: number }` |
| `CONTINUED_MEETING_MUTUAL_AGREEMENT` | Require mutual agreement documentation | `{ required: boolean }` |
| `AUDIO_RECORDING_RULE` | Audio recording policy | `{ staffMustRecordIfParentRecords: boolean, markAsNotOfficialRecord: boolean }` |

## Evidence Types

| Key | Name | Used For |
|-----|------|----------|
| `CONFERENCE_NOTES` | Conference Notes | Meeting documentation |
| `CONSENT_FORM` | Parent Consent Form | Initial IEP consent |
| `NOTICE_WAIVER` | Notice Waiver | Continued meetings with short notice |
| `RECORDING_ACK` | Recording Acknowledgment | Audio recording compliance |
| `PARENT_DOCS_PRE_SENT` | Pre-Meeting Documents Sent | Pre-meeting delivery confirmation |
| `PARENT_DOCS_POST_SENT` | Final Document Sent | Post-meeting delivery confirmation |

## Indexes

The following indexes are created for query performance:

### RulePack

```sql
CREATE INDEX idx_rulepack_scope_active
ON "RulePack" ("scopeType", "scopeId", "planType", "isActive");
```

### PlanMeeting

```sql
CREATE INDEX idx_planmeeting_student ON "PlanMeeting" ("studentId");
CREATE INDEX idx_planmeeting_plan ON "PlanMeeting" ("planInstanceId");
CREATE INDEX idx_planmeeting_type ON "PlanMeeting" ("meetingTypeId");
CREATE INDEX idx_planmeeting_status ON "PlanMeeting" ("status");
CREATE INDEX idx_planmeeting_scheduled ON "PlanMeeting" ("scheduledAt");
```

### MeetingEvidence

```sql
CREATE UNIQUE INDEX idx_meetingevidence_unique
ON "MeetingEvidence" ("meetingId", "evidenceTypeId");

CREATE INDEX idx_meetingevidence_meeting ON "MeetingEvidence" ("meetingId");
CREATE INDEX idx_meetingevidence_type ON "MeetingEvidence" ("evidenceTypeId");
```

### MeetingTask

```sql
CREATE INDEX idx_meetingtask_meeting ON "MeetingTask" ("meetingId");
CREATE INDEX idx_meetingtask_completed ON "MeetingTask" ("isCompleted");
```
