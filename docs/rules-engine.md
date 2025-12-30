# Rules Engine

This document describes how the rules engine resolves and applies compliance rules.

## Table of Contents

- [Overview](#overview)
- [Scope Precedence](#scope-precedence)
- [Config Merge](#config-merge)
- [Business Day Calculations](#business-day-calculations)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)

## Overview

The rules engine (`rulesEvaluator.ts`) provides:

1. **Rule Pack Resolution** - Find the active rule pack based on scope precedence
2. **Config Merge** - Merge rule pack configs with system defaults
3. **Deadline Calculation** - Compute due dates using business day math
4. **Enforcement Evaluation** - Check if meetings can be closed/plans implemented

## Scope Precedence

Rule packs are resolved in order from most specific to least specific:

```
SCHOOL > DISTRICT > STATE > System Defaults
```

### Resolution Algorithm

```typescript
async function getActiveRulePack(
  scopeType: string,
  scopeId: string,
  planType: RulePlanType
): Promise<ResolvedRulePack | null>
```

**Steps:**

1. If `scopeType` is `SCHOOL`:
   - Check for active pack at SCHOOL level
   - Fall back to DISTRICT level
   - Fall back to STATE level

2. If `scopeType` is `DISTRICT`:
   - Check for active pack at DISTRICT level
   - Fall back to STATE level

3. If `scopeType` is `STATE`:
   - Check for active pack at STATE level only

4. Return `null` if no pack found (no enforcement)

### Example Lookup

For a student at "Wilde Lake HS" in "HCPSS" district in "Maryland":

```typescript
const precedence = [
  { scopeType: 'SCHOOL', scopeId: 'wilde-lake-hs-id' },
  { scopeType: 'DISTRICT', scopeId: 'hcpss-id' },
  { scopeType: 'STATE', scopeId: 'MD' },
];
```

The engine checks each scope in order and returns the first active pack found.

### Plan Type Matching

Within each scope, plan types are matched:

1. First, look for exact match (e.g., `IEP`)
2. If not found, look for `ALL` type
3. If neither found, continue to next scope level

### Effective Date Filtering

Only packs meeting these criteria are considered:

- `isActive = true`
- `effectiveFrom <= now()`
- `effectiveTo IS NULL OR effectiveTo >= now()`

## Config Merge

Rule configurations are merged with system defaults.

### System Defaults

```typescript
const DEFAULTS = {
  PRE_MEETING_DOCS_DAYS: { days: 5 },
  POST_MEETING_DOCS_DAYS: { days: 5 },
  DEFAULT_DELIVERY_METHOD: { method: 'SEND_HOME' },
  US_MAIL_PRE_MEETING_DAYS: { days: 3 },
  US_MAIL_POST_MEETING_DAYS: { days: 3 },
  CONFERENCE_NOTES_REQUIRED: { required: true },
  INITIAL_IEP_CONSENT_GATE: { enabled: true },
  CONTINUED_MEETING_NOTICE_DAYS: { days: 10 },
  CONTINUED_MEETING_MUTUAL_AGREEMENT: { required: true },
  AUDIO_RECORDING_RULE: {
    staffMustRecordIfParentRecords: true,
    markAsNotOfficialRecord: true,
  },
};
```

### Merge Logic

```typescript
function mergeConfig(
  defaults: RuleConfig,
  packConfig: Partial<RuleConfig>
): RuleConfig {
  const merged = { ...defaults };

  for (const [key, value] of Object.entries(packConfig)) {
    if (value !== null && value !== undefined) {
      merged[key] = { ...merged[key], ...value };
    }
  }

  return merged;
}
```

### Example

State pack with partial override:

```typescript
// State pack config
const stateConfig = {
  PRE_MEETING_DOCS_DAYS: { days: 7 },
  CONFERENCE_NOTES_REQUIRED: { required: false },
};

// Merged result
const merged = {
  PRE_MEETING_DOCS_DAYS: { days: 7 },           // Overridden
  POST_MEETING_DOCS_DAYS: { days: 5 },          // Default
  CONFERENCE_NOTES_REQUIRED: { required: false }, // Overridden
  INITIAL_IEP_CONSENT_GATE: { enabled: true },  // Default
  // ... rest of defaults
};
```

## Business Day Calculations

The engine calculates document delivery deadlines using business days.

### Function

```typescript
function addBusinessDays(date: Date, days: number): Date
```

- Positive `days` moves forward
- Negative `days` moves backward
- Skips Saturday (6) and Sunday (0)

### Holiday Support

The current implementation excludes weekends. A holiday hook is available for future enhancement:

```typescript
// Future implementation
const holidays: Date[] = []; // Populated from config/database

function isHoliday(date: Date): boolean {
  return holidays.some(h =>
    h.getFullYear() === date.getFullYear() &&
    h.getMonth() === date.getMonth() &&
    h.getDate() === date.getDate()
  );
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = Math.abs(days);
  const direction = days < 0 ? -1 : 1;

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(result)) {
      remaining--;
    }
  }
  return result;
}
```

### Deadline Calculation

```typescript
function calculateDueDates(
  meetingDate: Date,
  rulePack: ResolvedRulePack | null
): DueDates {
  const dueDates: DueDates = {
    preDocsDeadline: null,
    postDocsDeadline: null,
    usMailPreDocsDeadline: null,
    usMailPostDocsDeadline: null,
  };

  if (!rulePack) return dueDates;

  // Pre-meeting docs deadline
  const preDays = rulePack.rules.get('PRE_MEETING_DOCS_DAYS')?.config?.days || 5;
  dueDates.preDocsDeadline = addBusinessDays(meetingDate, -preDays);

  // Post-meeting docs deadline
  const postDays = rulePack.rules.get('POST_MEETING_DOCS_DAYS')?.config?.days || 5;
  dueDates.postDocsDeadline = addBusinessDays(meetingDate, postDays);

  // US Mail offsets
  const usMailPreDays = rulePack.rules.get('US_MAIL_PRE_MEETING_DAYS')?.config?.days || 3;
  dueDates.usMailPreDocsDeadline = addBusinessDays(dueDates.preDocsDeadline, -usMailPreDays);

  const usMailPostDays = rulePack.rules.get('US_MAIL_POST_MEETING_DAYS')?.config?.days || 3;
  dueDates.usMailPostDocsDeadline = addBusinessDays(dueDates.postDocsDeadline, -usMailPostDays);

  return dueDates;
}
```

## API Reference

### GET /api/rules/context

Returns resolved rule metadata for a student and plan type.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| studentId | UUID | Yes | Student ID |
| planType | string | Yes | `IEP`, `PLAN504`, or `BIP` |
| meetingType | string | No | `INITIAL`, `ANNUAL`, `REVIEW`, `AMENDMENT`, `CONTINUED` |
| scheduledAt | ISO date | No | Scheduled meeting date for deadline calculation |

**Response:**

```json
{
  "resolved": true,
  "rulePack": {
    "id": "uuid",
    "name": "Maryland State IEP Rules",
    "version": 3,
    "scopeType": "STATE",
    "scopeId": "MD",
    "planType": "IEP"
  },
  "precedence": {
    "searched": [
      { "scopeType": "SCHOOL", "scopeId": "school-id" },
      { "scopeType": "DISTRICT", "scopeId": "district-id" },
      { "scopeType": "STATE", "scopeId": "MD" }
    ],
    "matched": { "scopeType": "STATE", "scopeId": "MD" }
  },
  "gates": [
    {
      "key": "CONFERENCE_NOTES_REQUIRED",
      "name": "Conference Notes Required",
      "enabled": true,
      "config": { "required": true },
      "description": "Requires conference notes before meeting can be closed"
    }
  ],
  "deadlines": {
    "preMeetingDocs": {
      "standardDeadline": "2024-01-08",
      "usMailDeadline": "2024-01-03",
      "businessDays": 5
    },
    "postMeetingDocs": {
      "standardDeadline": "2024-01-22",
      "usMailDeadline": "2024-01-17",
      "businessDays": 5
    }
  },
  "evidenceRequirements": [
    {
      "key": "CONFERENCE_NOTES",
      "name": "Conference Notes",
      "isRequired": true,
      "linkedRule": "CONFERENCE_NOTES_REQUIRED"
    }
  ],
  "meetingType": {
    "code": "ANNUAL",
    "name": "Annual Review",
    "description": "Yearly IEP review meeting"
  }
}
```

### GET /api/rules/defaults

Returns system default rule configurations.

**Response:**

```json
{
  "defaults": {
    "PRE_MEETING_DOCS_DAYS": { "days": 5 },
    "POST_MEETING_DOCS_DAYS": { "days": 5 },
    "DEFAULT_DELIVERY_METHOD": { "method": "SEND_HOME" },
    "US_MAIL_PRE_MEETING_DAYS": { "days": 3 },
    "US_MAIL_POST_MEETING_DAYS": { "days": 3 },
    "CONFERENCE_NOTES_REQUIRED": { "required": true },
    "INITIAL_IEP_CONSENT_GATE": { "enabled": true },
    "CONTINUED_MEETING_NOTICE_DAYS": { "days": 10 },
    "CONTINUED_MEETING_MUTUAL_AGREEMENT": { "required": true },
    "AUDIO_RECORDING_RULE": {
      "staffMustRecordIfParentRecords": true,
      "markAsNotOfficialRecord": true
    }
  }
}
```

## Usage Examples

### Fetching Rules for GPT Context

```typescript
// In AI assistant or chat context
const response = await fetch(
  `/api/rules/context?studentId=${studentId}&planType=IEP&meetingType=ANNUAL&scheduledAt=2024-01-15`
);
const context = await response.json();

// Use in prompt
const prompt = `
The student's meeting is governed by ${context.rulePack?.name || 'no specific rule pack'}.

Required evidence:
${context.evidenceRequirements.map(e => `- ${e.name}: ${e.isRequired ? 'Required' : 'Optional'}`).join('\n')}

Document deadlines:
- Pre-meeting docs due: ${context.deadlines?.preMeetingDocs.standardDeadline}
- Post-meeting docs due: ${context.deadlines?.postMeetingDocs.standardDeadline}
`;
```

### UI Enforcement Display

```tsx
// React component example
function MeetingEnforcement({ meetingId, studentId, planType, scheduledAt }) {
  const { data: rules } = useQuery({
    queryKey: ['rules-context', studentId, planType, scheduledAt],
    queryFn: () => fetch(
      `/api/rules/context?studentId=${studentId}&planType=${planType}&scheduledAt=${scheduledAt}`
    ).then(r => r.json()),
  });

  if (!rules?.resolved) {
    return <Notice>No compliance rules configured for this scope.</Notice>;
  }

  return (
    <EnforcementPanel>
      <DeadlineList>
        {rules.deadlines && (
          <>
            <Deadline
              label="Pre-meeting docs due"
              date={rules.deadlines.preMeetingDocs.standardDeadline}
            />
            <Deadline
              label="Post-meeting docs due"
              date={rules.deadlines.postMeetingDocs.standardDeadline}
            />
          </>
        )}
      </DeadlineList>
      <EvidenceChecklist items={rules.evidenceRequirements} />
    </EnforcementPanel>
  );
}
```

### Checking Enforcement Before Close

```typescript
// In API route
const enforcement = await evaluateMeetingEnforcement(meetingId, rulePack);

if (!enforcement.canClose) {
  return res.status(400).json({
    error: 'Cannot close meeting',
    issues: enforcement.errors,
  });
}

// Proceed with close
await prisma.planMeeting.update({
  where: { id: meetingId },
  data: {
    closedAt: new Date(),
    closedByUserId: req.user.id,
    rulePackId: rulePack?.id,
    rulePackVersion: rulePack?.version,
    status: 'CLOSED',
  },
});
```
