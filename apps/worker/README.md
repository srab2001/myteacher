# MD SPED Tools Worker Service

Python FastAPI worker service for document processing, OCR, and embeddings.

## Features

- **PDF Processing**: Extract text and tables from PDF documents
- **OCR**: Process scanned documents and images using Tesseract
- **Embeddings**: Generate and store vector embeddings for semantic search
- **Vector Search**: Semantic search across document collections using pgvector

## Setup

### Prerequisites

- Python 3.10+
- Tesseract OCR installed on your system
- PostgreSQL with pgvector extension (Neon recommended)

### Installation

```bash
# Navigate to worker directory
cd apps/worker

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running the Service

```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8000

# Or from the root directory
pnpm dev:worker
```

### API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /ready` - Readiness check

### Documents
- `POST /api/documents/upload` - Upload and process PDF
- `POST /api/documents/extract-text` - Extract text from URL
- `GET /api/documents/{id}` - Get document details

### OCR
- `POST /api/ocr/process` - Process image with OCR
- `POST /api/ocr/process-pdf` - Process scanned PDF
- `POST /api/ocr/batch` - Batch process images

### Embeddings
- `POST /api/embeddings/generate` - Generate embedding
- `POST /api/embeddings/batch` - Batch generate embeddings
- `POST /api/embeddings/store` - Store document embeddings
- `POST /api/embeddings/search` - Semantic search

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:3000` |
