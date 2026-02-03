# Advocate - Maryland Special Education Parent Tools

A comprehensive application for parents and advocates to navigate Maryland's special education system with AI-powered tools for timeline tracking, document review, legal Q&A, and meeting preparation.

## Tools Available

### 1. Timeline & Compliance Tracker
Track special education deadlines and events based on Maryland COMAR regulations.
- **Auto-calculated deadlines**: Evaluation (60 days), IEP Meeting (30 days), Annual Review (365 days), Triennial (3 years)
- **Event tracking**: Record referrals, consent dates, evaluations, IEP meetings
- **Urgency alerts**: Visual indicators for overdue, urgent, and upcoming deadlines
- **Case management**: Organize student cases with notes and history

### 2. IEP/Evaluation Document Review
AI-powered analysis of IEP and evaluation documents.
- **Component checklist**: Verifies all COMAR-required IEP components are present
- **SMART goal analysis**: Checks goals for Specific, Measurable, Achievable, Relevant, Time-bound criteria
- **Questions generator**: Creates questions to ask the IEP team
- **COMAR citations**: References specific regulations for each finding

### 3. Maryland Rules Q&A with Citations
Ask questions about Maryland special education law and get accurate answers with source citations.
- **RAG-powered**: Uses pgvector for semantic search of legal documents
- **Knowledge base**: COMAR 13A.05.01, MSDE bulletins, IDEA, Section 504
- **Cited answers**: Every answer includes references to source documents
- **Conversation history**: Save and continue conversations

### 4. Meeting Preparation Builder
Prepare for IEP meetings with guided forms that generate professional documents.
- **Meeting agendas**: Time-allocated agendas for various meeting types
- **Parent concerns letters**: Formal letters citing IDEA regulations
- **Question lists**: 10-15 specific questions for the IEP team
- **Email templates**: Records requests and follow-up emails

## Project Structure

```
advocate/
├── apps/
│   ├── web/                      # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/          # API routes
│   │       │   │   ├── cases/    # Case management
│   │       │   │   ├── artifacts/# Document upload
│   │       │   │   ├── qa/       # Q&A endpoint
│   │       │   │   └── reviews/  # Document review
│   │       │   ├── cases/        # Timeline tracker pages
│   │       │   ├── qa/           # Q&A chat page
│   │       │   └── meeting-prep/ # Meeting prep page
│   │       ├── components/
│   │       │   ├── timeline/     # Deadline/event components
│   │       │   ├── artifacts/    # File upload components
│   │       │   ├── qa/           # Chat interface
│   │       │   ├── review/       # Review report
│   │       │   └── meeting-prep/ # Meeting prep forms
│   │       └── lib/
│   │           ├── db/           # Database client & schema
│   │           ├── timeline/     # MD timeline calculator
│   │           └── qa/           # RAG utilities
│   └── worker/                   # Python FastAPI service
│       ├── main.py               # Application entry
│       ├── endpoints/
│       │   ├── extract.py        # PDF extraction
│       │   ├── ingest.py         # Knowledge base
│       │   └── review.py         # Document review
│       ├── services/
│       │   ├── pdf_processor.py  # PyPDF2, pdfplumber, OCR
│       │   ├── knowledge_base.py # Vector embeddings
│       │   └── document_reviewer.py # AI review
│       └── db/
│           └── connection.py     # Neon PostgreSQL
└── packages/
    └── shared/                   # Shared TypeScript types
```

## Prerequisites

- Node.js 18+
- PNPM 8+
- Python 3.10+ (for worker service)
- PostgreSQL with pgvector extension (Neon recommended)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create environment files:

```bash
# apps/web/.env.local
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
OPENAI_API_KEY=your-openai-api-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
WORKER_API_URL=http://localhost:8000

# apps/worker/.env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
OPENAI_API_KEY=your-openai-api-key
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. Initialize Database

Run the schema on your Neon database:

```bash
# Using psql
psql $DATABASE_URL -f apps/web/src/lib/db/schema.sql
```

### 4. Run Development Servers

```bash
# Run web app (http://localhost:3000)
pnpm dev

# Run worker service (http://localhost:8000)
cd apps/worker && pip install -r requirements.txt && python main.py
```

## API Endpoints

### Cases & Timeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List all cases |
| POST | `/api/cases` | Create new case |
| GET | `/api/cases/[id]` | Get case with events/deadlines |
| POST | `/api/cases/[id]/events` | Add event (auto-calculates deadlines) |
| GET | `/api/cases/[id]/deadlines` | Get deadlines with urgency |

### Q&A
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/qa` | Ask question, get cited answer |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/[id]` | Get conversation messages |

### Document Review
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/artifacts/upload` | Upload document |
| POST | `/api/reviews/run` | Run AI review on artifact |
| GET | `/api/reviews/[id]` | Get review details |

### Worker Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/extract` | Extract text from PDF |
| POST | `/api/ingest/source` | Ingest document to KB |
| POST | `/api/ingest/search` | Semantic search KB |
| POST | `/api/review` | Run document review |

## Maryland Timeline Rules (COMAR 13A.05.01)

| Event | Deadline | Days |
|-------|----------|------|
| Consent to Evaluation | Evaluation Due | 60 calendar days |
| Evaluation Complete | IEP Meeting Due | 30 calendar days |
| IEP Meeting | Annual Review Due | 365 days |
| Evaluation/Triennial | Next Triennial Due | 3 years |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Database**: Neon PostgreSQL with pgvector
- **Storage**: Vercel Blob
- **Worker**: Python 3.10+, FastAPI
- **AI**: OpenAI GPT-4o, text-embedding-3-small
- **PDF**: PyPDF2, pdfplumber, Tesseract OCR

## Deployment

### Vercel (Web App)

1. Connect your GitHub repository to Vercel
2. Set root directory to `apps/web`
3. Add environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`
   - `WORKER_API_URL`

### Render/Railway (Worker)

1. Connect repository
2. Set root directory to `apps/worker`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS`

## License

Private - All rights reserved
