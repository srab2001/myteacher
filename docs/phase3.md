# Phase 3: 504 Plans & Behavior Intervention Plans

## Overview

Phase 3 adds complete support for two additional plan types beyond IEPs:

1. **504 Plans** - Accommodation plans for students with disabilities that don't require special education services
2. **Behavior Intervention Plans (BIPs)** - Structured plans for addressing challenging behaviors with data collection

Both plan types leverage the existing schema-driven plan engine from Phase 1/2, while BIPs also include behavior-specific data tracking features.

## Features Implemented

### 1. Database Schema Updates

#### New Enum
- `BehaviorMeasurementType`: FREQUENCY, DURATION, INTERVAL, RATING

#### New Models
- `BehaviorPlan`: Links to PlanInstance for behavior-specific data
- `BehaviorTarget`: Defines observable/measurable behaviors to track
- `BehaviorEvent`: Records individual behavior occurrences

#### Updated Models
- `AppUser`: Added `behaviorEvents` relation for tracking who recorded events
- `PlanInstance`: Added `behaviorPlan` relation

### 2. Seed Data

#### 504 Plan Schema (13 sections)
1. Referral Information
2. Student Profile
3. Student Strengths
4. Disability Information
5. Areas of Concern
6. External Supports
7. Evaluation History
8. Prior Special Education Status
9. Health, Emotional, and Trauma Considerations
10. Additional Information
11. Submission Information
12. Eligibility Determination
13. Accommodations and Services

#### Behavior Intervention Plan Schema (12 sections)
1. Student Information
2. Reason for Plan
3. Target Behavior Definition (special behavior_targets field type)
4. Triggers and Patterns
5. Replacement Behaviors
6. Instructional Supports
7. Environmental Supports
8. Response Procedures
9. Safety Procedures
10. Family/Home Component
11. Data Collection and Monitoring
12. Review and Modification

### 3. Backend API Routes

#### Behavior Plan Routes (`/api/behavior-plans`)
- `GET /plans/:planId` - Get behavior plan by plan instance ID
- `POST /plans/:planId/targets` - Create behavior target
- `GET /plans/:planId/targets` - List all targets for a plan

#### Behavior Target Routes (`/api/behavior-targets`)
- `PATCH /targets/:targetId` - Update target
- `DELETE /targets/:targetId` - Soft delete (deactivate) target
- `POST /targets/:targetId/events` - Record behavior event
- `GET /targets/:targetId/events` - Get events with filtering and summary

#### Behavior Event Routes (`/api/behavior-events`)
- `DELETE /events/:eventId` - Delete event

### 4. Frontend Pages

#### Student Detail Page Updates
- Plan tiles grid showing IEP, 504, and Behavior plan status
- "Start [Plan Type]" or "Open [Plan Type]" buttons
- Quick access to Goals & Progress (IEP) and Record Data (Behavior)

#### 504 Plan Interview (`/students/[id]/plans/[planId]/504`)
- **Start Step**: Shows prior 504 plans with download links (if any exist)
  - Option to "Start Blank" or "Review Prior 504 Plans"
  - Skips start step if plan has existing data or no prior plans
- Stepper interface with sidebar navigation
- All 13 sections with appropriate field types
- Save/Next/Back navigation
- Finalize button on last section
- AI draft generation support for textarea fields
- Link to printable view

#### Behavior Plan Interview (`/students/[id]/plans/[planId]/behavior`)
- Stepper interface with all 12 sections
- Special handling for behavior_targets field type
- Link to data recording page
- Finalize workflow

#### Behavior Targets Page (`/students/[id]/plans/[planId]/behavior/targets`)
- List of existing targets with details
- Create new target form with:
  - Code (short identifier)
  - Name
  - Measurement Type (FREQUENCY, DURATION, INTERVAL, RATING)
  - Operational Definition
  - Examples
  - Non-Examples
- Edit target functionality
- Activate/Deactivate targets
- Delete targets (with confirmation)
- Quick link to data recording

#### Behavior Data Recording (`/students/[id]/plans/[planId]/behavior/data`)
- Target selection sidebar
- Target details display (definition, examples, non-examples)
- Event recording modal with measurement-type-specific inputs:
  - **FREQUENCY**: Count field
  - **DURATION**: Duration (seconds), start/end time
  - **INTERVAL**: Start/end time, count of intervals met
  - **RATING**: 1-5 rating scale
- Context/notes field for all event types
- Date range filtering for events
- Summary statistics:
  - Total events
  - Total count / Average count (FREQUENCY)
  - Total duration / Average duration (DURATION)
  - Average rating (RATING)
- Event history list with delete option

### 5. API Type Definitions

Added to `apps/web/src/lib/api.ts`:
- `BehaviorMeasurementType` enum
- `BehaviorTarget` interface
- `BehaviorEvent` interface
- `BehaviorPlan` interface
- `BehaviorEventSummary` interface
- API methods for all behavior endpoints

### 6. Tests

#### Backend Tests (`apps/api/src/test/`)
- `504.test.ts` - 504 plan creation, field updates, finalization, access control
- `behavior.test.ts` - Behavior plan creation, target management, event recording

#### Frontend Tests (`apps/web/src/__tests__/`)
- `504-form.test.tsx` - 504 form rendering, navigation, field handling, prior plans
- `behavior-plan.test.tsx` - Behavior plan wizard, target management, event recording

## File Changes Summary

### New Files
- `apps/api/src/routes/behavior.ts` - Behavior API routes
- `apps/api/src/test/504.test.ts` - 504 backend tests
- `apps/api/src/test/behavior.test.ts` - Behavior backend tests
- `apps/web/src/app/students/[id]/plans/[planId]/504/page.tsx` - 504 interview page
- `apps/web/src/app/students/[id]/plans/[planId]/behavior/page.tsx` - Behavior plan page
- `apps/web/src/app/students/[id]/plans/[planId]/behavior/targets/page.tsx` - Targets page
- `apps/web/src/app/students/[id]/plans/[planId]/behavior/targets/page.module.css`
- `apps/web/src/app/students/[id]/plans/[planId]/behavior/data/page.tsx` - Data recording
- `apps/web/src/app/students/[id]/plans/[planId]/behavior/data/page.module.css`
- `apps/web/src/__tests__/504-form.test.tsx` - 504 frontend tests
- `apps/web/src/__tests__/behavior-plan.test.tsx` - Behavior frontend tests
- `docs/phase3.md` - This documentation

### Modified Files
- `packages/db/prisma/schema.prisma` - Added behavior models and enum
- `packages/db/prisma/seed.ts` - Added 504 and Behavior plan schemas
- `apps/api/src/app.ts` - Registered behavior routes
- `apps/api/src/routes/plans.ts` - Auto-create BehaviorPlan for BEHAVIOR_PLAN type
- `apps/web/src/lib/api.ts` - Added behavior types and API methods
- `apps/web/src/app/students/[id]/page.tsx` - Plan tiles grid
- `apps/web/src/app/students/[id]/page.module.css` - Plan tile styles
- `apps/web/src/app/students/[id]/plans/[planId]/iep/page.module.css` - Start step styles

## Deployment Notes

After merging to production:

1. **Run Prisma migration**:
   ```bash
   cd packages/db
   pnpm prisma migrate deploy
   ```

2. **Generate Prisma client**:
   ```bash
   pnpm prisma generate
   ```

3. **Run seed to add new schemas**:
   ```bash
   pnpm prisma db seed
   ```

## Access Control

All routes enforce:
- User authentication (`requireAuth`)
- Onboarding completion (`requireOnboarded`)
- Teacher-student relationship validation (only access plans for students assigned to the teacher)

Note: Full permission framework (canCreatePlans, canUpdatePlans, canReadAll) is planned for Phase 5.

## Future Enhancements (Phase 4+)

- Auto-fill from prior plans
- Print-friendly layouts for 504 and Behavior plans
- Data visualization/charts for behavior events
- Progress monitoring alerts
- Team collaboration features
