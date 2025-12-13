cat /home/user/myteacher-work/docs/TESTING.md
# MyTeacher Testing Guide

## Quick Start

```bash
# Navigate to project root
cd myteacher

# Install dependencies
pnpm install

# Generate Prisma client
cd packages/db && npx prisma generate && cd ../..

# Run all tests
pnpm test
```

## Test Files

| Test File | Coverage |
|-----------|----------|
| `apps/api/src/test/bip.test.ts` | BIP field keys, permissions, finalize validation |
| `apps/api/src/test/504.test.ts` | 504 Plan field keys and permissions |
| `apps/api/src/test/plans.test.ts` | Plan CRUD operations |
| `apps/api/src/test/users.test.ts` | User authentication and roles |
| `apps/api/src/test/admin.test.ts` | Admin routes and permissions |
| `apps/api/src/test/behavior.test.ts` | Behavior tracking |
| `apps/api/src/test/goals.test.ts` | IEP goals |
| `apps/api/src/test/services.test.ts` | Service logging |
| `apps/api/src/test/students.test.ts` | Student CRUD |

## Running Specific Tests

```bash
# Run only BIP tests
cd apps/api && pnpm test -- --testPathPattern=bip.test.ts

# Run only 504 tests
cd apps/api && pnpm test -- --testPathPattern=504.test.ts

# Run only plan tests
cd apps/api && pnpm test -- --testPathPattern=plans.test.ts

# Run tests in watch mode
cd apps/api && pnpm test:watch
```

## BIP Test Coverage

The BIP tests (`bip.test.ts`) verify:

### 1. Field Key Validation
- All 31 canonical BIP field keys are valid
- Invalid keys are rejected
- All keys start with `bip_` prefix
- All keys are lowercase snake_case

### 2. Permission Enforcement
- Non-admin cannot create BIP field definitions (HTTP 403)
- Non-admin cannot update BIP field options (HTTP 403)
- Only ADMIN and CASE_MANAGER can finalize BIP

### 3. Finalize Validation
- Blocks finalization when required fields missing
- Returns list of 10 required BIP fields
- Error format: `{ error: "MISSING_REQUIRED_FIELDS", fields: [...] }`

### 4. Field Value Round-Trip
- Field keys persist through save/retrieve
- CHECKBOX_GROUP fields store as arrays

### 5. Section Order
- Verifies 13 BIP sections in correct order

## Manual Testing Checklist

### Setup
1. Start the database: `docker-compose up -d postgres`
2. Run migrations: `cd packages/db && npx prisma migrate deploy`
3. Seed database: `cd packages/db && pnpm seed`
4. Start API: `cd apps/api && pnpm dev`
5. Start web: `cd apps/web && pnpm dev`

### Test Credentials
- Admin: `stuadmin` / `stuteacher1125`
- Teacher: Login via Google OAuth (test account)

### BIP Manual Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create BIP | Admin creates BIP for student | BIP created successfully |
| Edit BIP values | Teacher edits assigned student's BIP | Values save correctly |
| Non-admin config | Teacher tries `/admin/forms/fields` | HTTP 403 Forbidden |
| Finalize with missing fields | Try to finalize BIP with empty required fields | Error lists missing fields |
| Finalize complete BIP | Fill all 10 required fields, finalize | Status changes to FINALIZED |
| Section order | View BIP form | Sections render in correct order (1-13) |

### Required BIP Fields (for finalization)
1. `bip_student_school_id` - School
2. `bip_plan_date` - Plan Date
3. `bip_team_members` - Team Members
4. `bip_behavior_1_definition` - Target Behavior 1
5. `bip_baseline_summary` - Baseline Summary
6. `bip_data_sources` - Data Sources
7. `bip_function_of_behavior` - Function of Behavior
8. `bip_staff_response_steps` - Staff Response Steps
9. `bip_progress_monitoring_method` - Progress Monitoring Method
10. `bip_progress_review_frequency` - Progress Review Frequency

## Database Setup for Tests

The tests use mocked Prisma client. For integration tests against a real database:

```bash
# Create test database
createdb myteacher_test

# Set test DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/myteacher_test"

# Run migrations
cd packages/db && npx prisma migrate deploy

# Seed test data
cd packages/db && pnpm seed
```

## Troubleshooting

### Prisma Client Not Generated
```bash
cd packages/db && npx prisma generate
# or from API folder
cd apps/api && npx prisma generate
```

### Test Timeout
Increase timeout in jest.config.js:
```js
testTimeout: 30000
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## CI/CD Notes

Tests run automatically on push via GitHub Actions. The workflow:
1. Sets up Node.js 20
2. Installs pnpm
3. Runs `pnpm install`
4. Generates Prisma client
5. Runs `pnpm test`