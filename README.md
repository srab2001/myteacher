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
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js (Google OAuth2 + Local)
- **Testing**: Jest, React Testing Library, Supertest

## License

Private - All rights reserved
