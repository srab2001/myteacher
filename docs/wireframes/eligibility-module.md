# Eligibility Module Wireframe

## Overview
The Eligibility Module tracks the eligibility determination process after evaluation is complete. It documents the IEP team's decision on whether a student qualifies for special education services.

## Data Model

```
EligibilityDetermination
├── id (uuid)
├── studentId (FK → Student)
├── referralId (FK → Referral, optional)
├── planType (IEP | FIVE_OH_FOUR | BEHAVIOR_PLAN)
├── determinationType (INITIAL | RE_EVALUATION | CHANGE_OF_ELIGIBILITY)
├── status (DRAFT | MEETING_SCHEDULED | DETERMINATION_MADE | FINALIZED)
├── meetingDate
├── meetingLocation
├──
├── // Evaluation Data
├── evaluationSummary (text)
├── evaluationData (json - assessment results)
├──
├── // Eligibility Decision
├── isEligible (boolean, null until determined)
├── primaryDisabilityCategory (enum - IDEA categories)
├── secondaryDisabilityCategories (json array)
├── eligibilityCriteriaMet (json - which criteria were met)
├── determinationRationale (text)
├──
├── // If Not Eligible
├── nonEligibilityReason (text)
├── alternativeRecommendations (text)
├──
├── // Parent Response
├── parentNotificationDate
├── parentAgreement (AGREE | DISAGREE | PENDING)
├── parentDisagreementReason (text)
├──
├── createdAt, updatedAt
├── createdByUserId, updatedByUserId (FK → AppUser)
└── participants[] (FK → EligibilityParticipant)

EligibilityParticipant
├── id (uuid)
├── eligibilityId (FK → EligibilityDetermination)
├── participantType (PARENT | TEACHER | SPECIALIST | ADMIN | PSYCHOLOGIST | OTHER)
├── name
├── title
├── email
├── attended (boolean)
├── signatureId (FK → SignatureRecord, optional)
└── notes
```

## IDEA Disability Categories

```
- AUTISM
- DEAF_BLINDNESS
- DEAFNESS
- DEVELOPMENTAL_DELAY
- EMOTIONAL_DISTURBANCE
- HEARING_IMPAIRMENT
- INTELLECTUAL_DISABILITY
- MULTIPLE_DISABILITIES
- ORTHOPEDIC_IMPAIRMENT
- OTHER_HEALTH_IMPAIRMENT
- SPECIFIC_LEARNING_DISABILITY
- SPEECH_LANGUAGE_IMPAIRMENT
- TRAUMATIC_BRAIN_INJURY
- VISUAL_IMPAIRMENT
```

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [← Back to Student]    Student: John Doe    Grade: 5                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ELIGIBILITY DETERMINATION                                                  │
│  ═════════════════════════                                                  │
│                                                                             │
│  Status: [DETERMINATION_MADE ▼]         Type: Initial Evaluation            │
│  Linked Referral: REF-2025-001                                              │
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│  MEETING INFORMATION             │  TEAM PARTICIPANTS                       │
│  ────────────────────────        │  ─────────────────                       │
│  Meeting Date: [01/25/2025]      │  ┌────────────────────────────────────┐  │
│  Location: [Conference Room B]   │  │ Name          Role        Attended │  │
│                                  │  ├────────────────────────────────────┤  │
│                                  │  │ Jane Doe      Parent      ✓        │  │
│                                  │  │ Ms. Smith     Teacher     ✓        │  │
│                                  │  │ Dr. Johnson   Psychologist ✓       │  │
│                                  │  │ Mr. Brown     Principal   ✓        │  │
│                                  │  │                    [+ Add Member]  │  │
│                                  │  └────────────────────────────────────┘  │
├──────────────────────────────────┴──────────────────────────────────────────┤
│                                                                             │
│  EVALUATION SUMMARY                                                         │
│  ─────────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Comprehensive evaluation completed on 01/20/2025. Testing included: │    │
│  │ - Cognitive: WISC-V (FSIQ: 95)                                      │    │
│  │ - Achievement: Woodcock-Johnson IV (Reading: 78, Math: 92)          │    │
│  │ - Behavior: BASC-3 (Attention: Elevated, Anxiety: At-Risk)          │    │
│  │ - Classroom observations conducted on 01/10 and 01/15               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ELIGIBILITY DECISION                                                       │
│  ════════════════════                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Is student eligible for special education services?                 │    │
│  │                                                                     │    │
│  │    (●) Yes, student IS eligible                                     │    │
│  │    ( ) No, student is NOT eligible                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PRIMARY DISABILITY CATEGORY                                         │    │
│  │ [Specific Learning Disability ▼]                                    │    │
│  │                                                                     │    │
│  │ ADDITIONAL CATEGORIES (if applicable)                               │    │
│  │ [ ] Other Health Impairment                                         │    │
│  │ [ ] Speech/Language Impairment                                      │    │
│  │ [ ] Emotional Disturbance                                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ELIGIBILITY CRITERIA MET                                            │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ For Specific Learning Disability:                                   │    │
│  │                                                                     │    │
│  │ [x] Student does not achieve adequately for age/grade standards     │    │
│  │ [x] Student does not make sufficient progress with interventions    │    │
│  │ [x] Pattern of strengths and weaknesses in achievement              │    │
│  │ [x] Exclusionary factors have been ruled out                        │    │
│  │     [ ] Vision/hearing problems                                     │    │
│  │     [ ] Intellectual disability                                     │    │
│  │     [ ] Emotional disturbance                                       │    │
│  │     [ ] Cultural/environmental factors                              │    │
│  │     [ ] Limited English proficiency                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ DETERMINATION RATIONALE                                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ Based on the comprehensive evaluation, the team has determined  │ │    │
│  │ │ that John meets the criteria for Specific Learning Disability   │ │    │
│  │ │ in the area of reading. There is a significant discrepancy     │ │    │
│  │ │ between cognitive ability and reading achievement...            │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PARENT RESPONSE                                                            │
│  ───────────────                                                            │
│  Notification Date: [01/25/2025]                                            │
│                                                                             │
│  Parent Agreement: (●) Agree  ( ) Disagree  ( ) Pending                     │
│                                                                             │
│  [If Disagree: Reason field appears]                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NEXT STEPS                                                                 │
│  ──────────                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ✓ Eligibility determination complete                                │    │
│  │ ○ Parent consent for initial placement needed                       │    │
│  │ ○ IEP to be developed within 30 days                               │    │
│  │ ○ Services to begin upon consent                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                              [Save Draft]  [Finalize Determination]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## If NOT Eligible

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ELIGIBILITY DECISION                                                       │
│  ════════════════════                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Is student eligible for special education services?                 │    │
│  │                                                                     │    │
│  │    ( ) Yes, student IS eligible                                     │    │
│  │    (●) No, student is NOT eligible                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ REASON FOR NON-ELIGIBILITY                                          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ While the student shows some difficulties in reading, the       │ │    │
│  │ │ evaluation data does not indicate a significant discrepancy...  │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ALTERNATIVE RECOMMENDATIONS                                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ - Continue Tier 2 reading interventions                         │ │    │
│  │ │ - Consider 504 plan for accommodations                          │ │    │
│  │ │ - Re-evaluate in 6 months if concerns persist                   │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students/:studentId/eligibility | List eligibility records |
| GET | /api/eligibility/:id | Get eligibility details |
| POST | /api/students/:studentId/eligibility | Create eligibility determination |
| PATCH | /api/eligibility/:id | Update eligibility |
| DELETE | /api/eligibility/:id | Delete draft eligibility |
| POST | /api/eligibility/:id/participants | Add participant |
| PATCH | /api/eligibility/:id/participants/:pid | Update participant |
| DELETE | /api/eligibility/:id/participants/:pid | Remove participant |
| POST | /api/eligibility/:id/finalize | Finalize determination |

## Status Workflow

```
DRAFT → MEETING_SCHEDULED → DETERMINATION_MADE → FINALIZED
```

## Business Rules

1. All required team members must be listed (parent, gen ed teacher, special ed teacher, admin)
2. Eligibility decision cannot be finalized without meeting date
3. If eligible, system prompts creation of IEP within 30 days
4. If not eligible, alternative recommendations are required
5. Parent agreement/disagreement must be documented
6. All changes logged to Decision Ledger
7. Creates SignatureRequest for all participants upon finalization
