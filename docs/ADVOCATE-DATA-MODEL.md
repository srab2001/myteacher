# Advocate Data Model

Complete database schema for the Maryland Special Education Tools application.

**Database:** Neon PostgreSQL with pgvector extension
**Schema File:** `apps/web/src/lib/db/schema.sql`

---

## Entity Relationship Diagram

```
users ──────┬──── cases ──────┬──── case_events
            │                 ├──── deadlines
            │                 ├──── artifacts ──── reviews
            │                 └──── meeting_preps
            ├──── conversations ──── messages
            └──── meeting_preps

documents ──── chunks (vector embeddings)
```

---

## Tables

### 1. users

Parent and advocate accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| email | TEXT | UNIQUE, NOT NULL | Login email |
| name | TEXT | nullable | Display name |
| role | TEXT | CHECK (parent, advocate, admin) | User role, default: parent |
| state | TEXT | NOT NULL, default: MD | State code |
| county | TEXT | nullable | County name |
| plan_tier | TEXT | CHECK (free, basic, pro) | Subscription tier, default: free |
| status | TEXT | CHECK (active, inactive, suspended) | Account status, default: active |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| closed_at | TIMESTAMPTZ | nullable | Account closure date |
| deleted_at | TIMESTAMPTZ | nullable | Soft delete date |

### 2. cases

Student special education cases.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → users(id), CASCADE | Owning parent/advocate |
| student_alias | TEXT | NOT NULL | Privacy-safe student name |
| grade | TEXT | nullable | Current grade level |
| school | TEXT | nullable | School name |
| district | TEXT | nullable | School district |
| plan_type | TEXT | CHECK (iep, 504, unknown) | Plan type, default: unknown |
| status | TEXT | CHECK (active, closed, archived) | Case status, default: active |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger | Last update timestamp |

### 3. case_events

Timeline events that trigger deadline calculations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| case_id | UUID | FK → cases(id), CASCADE | Parent case |
| event_type | TEXT | CHECK (see below) | Type of event |
| event_date | DATE | NOT NULL | Date the event occurred |
| notes | TEXT | nullable | Additional notes |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |

**Event Types:**
- `referral_date` - School received the referral
- `consent_date` - Parent signed consent for evaluation
- `evaluation_date` - Evaluation was completed
- `iep_meeting_date` - IEP team meeting held
- `annual_review_date` - Annual IEP review conducted
- `triennial_date` - Triennial reevaluation completed
- `amendment_date` - IEP amendment made
- `transition_meeting_date` - Transition planning meeting

### 4. deadlines

Calculated compliance deadlines based on Maryland COMAR 13A.05.01.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| case_id | UUID | FK → cases(id), CASCADE | Parent case |
| deadline_type | TEXT | CHECK (see below) | Type of deadline |
| deadline_date | DATE | NOT NULL | Calculated due date |
| calculated_from | TEXT | NOT NULL | Human-readable calculation rule |
| source_event_id | UUID | FK → case_events(id), CASCADE | Event that triggered this deadline |
| status | TEXT | CHECK (pending, met, missed, waived) | Deadline status, default: pending |
| met_date | DATE | nullable | Date the deadline was met |
| notes | TEXT | nullable | Additional notes |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger | Last update timestamp |

**Deadline Types:**
- `evaluation_due` - 60 calendar days from consent
- `iep_meeting_due` - 30 calendar days from evaluation
- `annual_review_due` - 365 days from last IEP meeting
- `triennial_due` - 3 years from last evaluation
- `consent_response_due` - 30 calendar days for consent response

### 5. artifacts

Uploaded documents (IEPs, evaluations, notices, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| case_id | UUID | FK → cases(id), CASCADE | Parent case |
| artifact_type | TEXT | CHECK (see below) | Document category |
| file_name | TEXT | NOT NULL | Original file name |
| blob_url | TEXT | NOT NULL | Vercel Blob storage URL |
| mime_type | TEXT | NOT NULL | File MIME type |
| file_size_bytes | INT | NOT NULL | File size in bytes |
| uploaded_at | TIMESTAMPTZ | NOT NULL, auto | Upload timestamp |
| extracted_text | TEXT | nullable | Text extracted from document |
| extraction_status | TEXT | CHECK (pending, processing, completed, failed) | Extraction progress |
| extraction_error | TEXT | nullable | Error message if extraction failed |

**Artifact Types:** notice, iep, evaluation, 504_plan, progress_report, correspondence, other

### 6. documents

Knowledge base library for RAG (legal documents, regulations, policies).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| source_type | TEXT | CHECK (see below) | Document source category |
| title | TEXT | NOT NULL | Document title |
| county | TEXT | nullable | County-specific documents |
| url | TEXT | nullable | Source URL |
| content | TEXT | nullable | Full document text |
| content_hash | TEXT | UNIQUE | Deduplication hash |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger | Last update timestamp |

**Source Types:** comar, msde, county_policy, idea, section_504, guidance

### 7. chunks

Document chunks with vector embeddings for semantic search (RAG).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| document_id | UUID | FK → documents(id), CASCADE | Parent document |
| chunk_index | INT | NOT NULL | Position within document |
| content | TEXT | NOT NULL | Chunk text content |
| embedding | vector(1536) | nullable | OpenAI text-embedding-3-small vector |
| metadata | JSONB | nullable | Additional chunk metadata |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |

**Vector Index:** IVFFlat with cosine similarity, 100 lists

### 8. conversations

Q&A chat conversation sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → users(id), CASCADE | Conversation owner |
| case_id | UUID | FK → cases(id), SET NULL | Optional linked case |
| title | TEXT | nullable | Conversation title |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger | Last update timestamp |

### 9. messages

Individual chat messages within conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| conversation_id | UUID | FK → conversations(id), CASCADE | Parent conversation |
| role | TEXT | CHECK (user, assistant, system) | Message sender role |
| content | TEXT | NOT NULL | Message text |
| metadata | JSONB | nullable | Citations, sources, etc. |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |

### 10. reviews

AI-powered document analysis results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| artifact_id | UUID | FK → artifacts(id), CASCADE | Reviewed document |
| review_type | TEXT | CHECK (see below) | Type of review |
| findings | JSONB | NOT NULL | Structured review findings |
| summary | TEXT | nullable | Human-readable summary |
| score | DECIMAL(3,2) | nullable | Compliance score 0.00-1.00 |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |

**Review Types:** iep_review, evaluation_review, 504_review, compliance_check

**Findings JSONB Structure:**
```json
{
  "components": [
    { "name": "Present Levels", "present": true, "notes": "..." },
    { "name": "Annual Goals", "present": true, "notes": "..." }
  ],
  "goals": [
    { "goal": "...", "specific": true, "measurable": true, "achievable": true, "relevant": true, "timeBound": false }
  ],
  "questions": ["Question 1?", "Question 2?"],
  "citations": ["COMAR 13A.05.01.09", "34 CFR 300.320"]
}
```

### 11. meeting_preps

Meeting preparation materials and generated content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| case_id | UUID | FK → cases(id), CASCADE | Related case |
| user_id | UUID | FK → users(id), CASCADE | Preparing parent/advocate |
| meeting_type | TEXT | CHECK (initial, annual, triennial, revision) | Meeting category |
| meeting_date | DATE | NOT NULL | Scheduled meeting date |
| form_data | JSONB | NOT NULL | User-entered form data |
| generated_materials | JSONB | nullable | AI-generated materials |
| status | TEXT | CHECK (draft, generated, exported) | Prep status, default: draft |
| created_at | TIMESTAMPTZ | NOT NULL, auto | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger | Last update timestamp |

**Generated Materials JSONB Structure:**
```json
{
  "agenda": { "items": [...], "totalMinutes": 60 },
  "concernsLetter": "Dear IEP Team,...",
  "questions": ["Question 1?", ...],
  "emailDraft": "Subject: Records Request..."
}
```

---

## Indexes

| Index | Table | Columns | Type |
|-------|-------|---------|------|
| idx_cases_user_id | cases | user_id | B-tree |
| idx_case_events_case_id | case_events | case_id | B-tree |
| idx_case_events_event_type | case_events | event_type | B-tree |
| idx_deadlines_case_id | deadlines | case_id | B-tree |
| idx_deadlines_status | deadlines | status | B-tree |
| idx_deadlines_deadline_date | deadlines | deadline_date | B-tree |
| idx_artifacts_case_id | artifacts | case_id | B-tree |
| idx_chunks_document_id | chunks | document_id | B-tree |
| idx_chunks_embedding | chunks | embedding | IVFFlat (cosine, 100 lists) |
| idx_conversations_user_id | conversations | user_id | B-tree |
| idx_messages_conversation_id | messages | conversation_id | B-tree |
| idx_reviews_artifact_id | reviews | artifact_id | B-tree |
| idx_meeting_preps_case_id | meeting_preps | case_id | B-tree |

---

## Triggers

| Trigger | Table | Function | Description |
|---------|-------|----------|-------------|
| update_cases_updated_at | cases | update_updated_at_column() | Auto-update updated_at on UPDATE |
| update_deadlines_updated_at | deadlines | update_updated_at_column() | Auto-update updated_at on UPDATE |
| update_documents_updated_at | documents | update_updated_at_column() | Auto-update updated_at on UPDATE |
| update_conversations_updated_at | conversations | update_updated_at_column() | Auto-update updated_at on UPDATE |
| update_meeting_preps_updated_at | meeting_preps | update_updated_at_column() | Auto-update updated_at on UPDATE |

---

## Maryland Timeline Rules

Deadline auto-calculation rules based on COMAR 13A.05.01:

| Event Added | Deadline Created | Calculation |
|-------------|-----------------|-------------|
| consent_date | evaluation_due | event_date + 60 calendar days |
| evaluation_date | iep_meeting_due | event_date + 30 calendar days |
| evaluation_date | triennial_due | event_date + 3 years |
| iep_meeting_date | annual_review_due | event_date + 365 days |
| annual_review_date | annual_review_due | event_date + 365 days |
| triennial_date | triennial_due | event_date + 3 years |
| triennial_date | iep_meeting_due | event_date + 30 calendar days |

---

## TypeScript Types

All database types are defined in `apps/web/src/lib/db/types.ts`:

- `User`, `Case`, `CaseEvent`, `Deadline`, `Artifact`
- `Document`, `Chunk`, `Conversation`, `Message`
- `Review`, `MeetingPrep`
- Extended types: `CaseWithEvents`, `CaseWithArtifacts`, `DeadlineWithCase`, `DeadlineWithUrgency`
- Request types: `CreateCaseRequest`, `CreateEventRequest`, `CreateArtifactRequest`, `UpdateDeadlineRequest`
