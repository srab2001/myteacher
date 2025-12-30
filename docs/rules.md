# Compliance Rules System

The MyTeacher application includes an admin-configurable rules system for managing meeting compliance requirements. Rules can be scoped by state, district, or school and apply to specific plan types (IEP, 504, BIP).

## Table of Contents

- [Overview](#overview)
- [Rule Keys](#rule-keys)
- [Evidence Types](#evidence-types)
- [Meeting Types](#meeting-types)
- [Scope Precedence](#scope-precedence)
- [Enforcement Points](#enforcement-points)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Overview

Rule Packs group compliance rules together and are scoped to a jurisdiction level:

| Scope Type | Description | Example |
|------------|-------------|---------|
| STATE | Rules apply to all districts/schools in the state | Maryland statewide IEP rules |
| DISTRICT | Rules apply to all schools in the district | HCPSS district overrides |
| SCHOOL | Rules apply to a specific school | Wilde Lake HS custom rules |

Each Rule Pack is also associated with a **Plan Type** (IEP, 504, BIP, or ALL) and has a **version number** for tracking changes over time.

## Rule Keys

### Document Delivery Rules

| Key | Description | Config Fields | Default |
|-----|-------------|---------------|---------|
| `PRE_MEETING_DOCS_DAYS` | Business days before meeting for draft document delivery | `{ days: number }` | 5 days |
| `POST_MEETING_DOCS_DAYS` | Business days after meeting for final document delivery | `{ days: number }` | 5 days |
| `US_MAIL_PRE_MEETING_DAYS` | Additional days offset when using US Mail for pre-meeting docs | `{ days: number }` | 3 days |
| `US_MAIL_POST_MEETING_DAYS` | Additional days offset when using US Mail for post-meeting docs | `{ days: number }` | 3 days |
| `DEFAULT_DELIVERY_METHOD` | Default method for parent document delivery | `{ method: "SEND_HOME" \| "US_MAIL" \| "PICK_UP" }` | SEND_HOME |

### Meeting Documentation Rules

| Key | Description | Config Fields | Default |
|-----|-------------|---------------|---------|
| `CONFERENCE_NOTES_REQUIRED` | Require conference notes after meetings | `{ required: boolean }` | true |
| `INITIAL_IEP_CONSENT_GATE` | Block initial IEP implementation until consent obtained | `{ enabled: boolean }` | true |

### Continued Meeting Rules

| Key | Description | Config Fields | Default |
|-----|-------------|---------------|---------|
| `CONTINUED_MEETING_NOTICE_DAYS` | Minimum notice days for continued meetings | `{ days: number }` | 10 days |
| `CONTINUED_MEETING_MUTUAL_AGREEMENT` | Capture mutual agreement for continued meeting dates | `{ required: boolean }` | true |

### Audio Recording Rules

| Key | Description | Config Fields | Default |
|-----|-------------|---------------|---------|
| `AUDIO_RECORDING_RULE` | Policy for audio recording during meetings | `{ staffMustRecordIfParentRecords: boolean, markAsNotOfficialRecord: boolean }` | Both true |

## Evidence Types

Evidence types represent documentation that may be required for meeting compliance.

| Key | Name | Description | Linked Rule |
|-----|------|-------------|-------------|
| `PARENT_DOCS_SENT` | Pre-Meeting Documents Sent | Confirms pre-meeting draft documents were delivered | PRE_MEETING_DOCS_DAYS |
| `FINAL_DOC_SENT` | Final Document Sent | Confirms post-meeting final documents were delivered | POST_MEETING_DOCS_DAYS |
| `CONFERENCE_NOTES` | Conference Notes | Written notes documenting meeting discussion and decisions | CONFERENCE_NOTES_REQUIRED |
| `CONSENT_FORM` | Parent Consent Form | Signed consent for initial IEP implementation | INITIAL_IEP_CONSENT_GATE |
| `NOTICE_WAIVER` | Notice Waiver | Waiver for continued meetings with < required notice | CONTINUED_MEETING_NOTICE_DAYS |
| `RECORDING_ACK` | Recording Acknowledgment | Acknowledgment when audio recording occurs | AUDIO_RECORDING_RULE |
| `DELIVERY_CONFIRMATION` | Delivery Confirmation | Proof of document delivery method | - |

## Meeting Types

| Code | Name | Description | Typical Evidence Required |
|------|------|-------------|---------------------------|
| `INITIAL` | Initial IEP Meeting | First IEP for newly identified student | Pre-docs, Conference notes, Final docs, Consent |
| `ANNUAL` | Annual Review | Yearly IEP review | Pre-docs, Conference notes, Final docs |
| `REVIEW` | Review Meeting | Progress review or changes | Pre-docs, Conference notes, Final docs |
| `AMENDMENT` | IEP Amendment | Amendments to current IEP | Final docs |
| `CONTINUED` | Continued Meeting | Continuation of previous meeting | Final docs, Waiver (conditional) |

## Scope Precedence

When multiple Rule Packs could apply, the system uses the following precedence (most specific wins):

```
SCHOOL > DISTRICT > STATE
```

### Resolution Algorithm

1. Check for active Rule Pack at SCHOOL level for the student's school + plan type
2. If not found, check DISTRICT level for the student's district + plan type
3. If not found, check STATE level for the student's state + plan type
4. If still not found, use system defaults (no enforcement)

### Example

A student at "Wilde Lake HS" in "HCPSS" district in "Maryland" state with an IEP:

1. First check: Is there an active IEP pack for "Wilde Lake HS"? → Yes → Use it
2. First check: Is there an active IEP pack for "Wilde Lake HS"? → No
   - Second check: Is there an active IEP pack for "HCPSS"? → Yes → Use it
3. If neither exists, fall back to Maryland state IEP pack

## Enforcement Points

Rules are enforced at specific points in the meeting workflow:

### Meeting Scheduling (`POST /api/meetings`)

- Calculate document delivery deadlines based on delivery method
- Set pre-docs due date (accounting for US Mail offset if applicable)
- Attach active rule pack ID and version for audit trail

### Meeting Close (`POST /api/meetings/:id/close`)

The system evaluates the following before allowing close:

| Check | Error Code | Blocks Close? |
|-------|------------|---------------|
| Conference notes required but missing | `MISSING_CONFERENCE_NOTES` | Yes |
| Continued meeting < notice days without waiver | `MISSING_NOTICE_WAIVER` | Yes |
| Continued meeting without mutual agreement | `MISSING_MUTUAL_AGREEMENT` | Yes |
| Parent recording but staff not recording | `STAFF_RECORDING_REQUIRED` | Yes |

### Plan Implementation (`POST /api/meetings/plans/:id/implement`)

| Check | Error Code | Blocks Implementation? |
|-------|------------|------------------------|
| Initial IEP without consent | `MISSING_CONSENT` | Yes |
| Meeting not closed | `MEETING_NOT_CLOSED` | Yes |

## API Reference

### Public Endpoints (Authenticated Users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rule-packs` | List all rule packs (filter by scope/planType) |
| GET | `/api/rule-packs/active` | Get active rule pack for scope/planType |
| GET | `/api/rule-packs/:id` | Get specific rule pack |
| GET | `/api/rule-packs/definitions` | List all rule definitions |
| GET | `/api/rule-packs/evidence-types` | List all evidence types |
| GET | `/api/rule-packs/meeting-types` | List all meeting types |

### Admin Endpoints (Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/rule-packs` | List all rule packs with filters |
| POST | `/api/admin/rule-packs` | Create new rule pack |
| PATCH | `/api/admin/rule-packs/:id` | Update rule pack metadata |
| DELETE | `/api/admin/rule-packs/:id` | Delete rule pack |
| PUT | `/api/admin/rule-packs/:id/rules` | Bulk update rules for pack |
| PUT | `/api/admin/rule-packs/:id/evidence` | Update evidence requirements |

### Meeting Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings/student/:studentId` | List meetings for a student |
| GET | `/api/meetings/:id` | Get meeting details with enforcement status |
| POST | `/api/meetings` | Create a new meeting |
| PATCH | `/api/meetings/:id` | Update meeting details |
| POST | `/api/meetings/:id/evidence` | Add/update evidence |
| DELETE | `/api/meetings/:id/evidence/:evidenceId` | Remove evidence |
| POST | `/api/meetings/:id/mark-held` | Mark meeting as held |
| POST | `/api/meetings/:id/close` | Close meeting (with enforcement) |
| POST | `/api/meetings/:id/cancel` | Cancel meeting |
| POST | `/api/meetings/plans/:id/implement` | Implement plan (with consent check) |

## Troubleshooting

### Common Issues

#### "Cannot close meeting - Conference notes required"

**Cause:** The active rule pack requires conference notes (`CONFERENCE_NOTES_REQUIRED` is enabled).

**Solution:**
1. Add conference notes via `POST /api/meetings/:id/evidence` with `evidenceTypeId` for `CONFERENCE_NOTES`
2. Or disable the rule in the admin panel

#### "Cannot implement plan - Consent not obtained"

**Cause:** Initial IEP requires parent consent (`INITIAL_IEP_CONSENT_GATE` is enabled).

**Solution:**
1. Obtain parent consent
2. Record consent via evidence upload or set `consentStatus` to `OBTAINED`
3. Or disable the consent gate rule (not recommended for FAPE compliance)

#### "Waiver required for continued meeting"

**Cause:** Continued meeting scheduled with less than the required notice days.

**Solution:**
1. Upload a signed waiver via evidence
2. Or set `noticeWaiverSigned` to `true` on the meeting
3. Or reschedule the meeting to meet the notice requirement

#### "No rule pack found for scope"

**Cause:** No active rule pack exists for the student's scope hierarchy.

**Solution:**
1. Create a rule pack for the appropriate scope (state, district, or school)
2. Activate the rule pack
3. Note: Without an active rule pack, no enforcement is applied

### Audit Trail

Each closed meeting records:

| Field | Description |
|-------|-------------|
| `rulePackId` | ID of the rule pack that was active at close time |
| `rulePackVersion` | Version number of that rule pack |
| `closedByUserId` | User who closed the meeting |
| `closedAt` | Timestamp of closure |

This allows compliance audits to determine which rules were in effect when a meeting was completed.

### Admin vs Teacher Permissions

| Action | Teacher | Case Manager | Admin |
|--------|---------|--------------|-------|
| View meetings | Own students | Own students | All |
| Create/edit meetings | Own students | Own students | All |
| Close meetings | Yes (with enforcement) | Yes (with enforcement) | Yes |
| View rule packs | Read-only | Read-only | Full CRUD |
| Edit rule packs | No | No | Yes |
| Activate/deactivate rules | No | No | Yes |

### Database Models

The rules system uses these Prisma models:

- `RulePack` - Container for rules with scope/planType targeting
- `RulePackRule` - Individual rules within a pack with config
- `RuleDefinition` - Global rule key definitions
- `RuleEvidenceType` - Evidence type definitions
- `MeetingType` - Meeting type definitions
- `PlanMeeting` - Individual meeting records
- `MeetingEvidence` - Evidence attached to meetings
- `MeetingTask` - Action items from meetings
