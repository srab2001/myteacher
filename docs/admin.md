# Admin Guide

This guide covers administrative tasks for managing the MyTeacher compliance rules system.

## Table of Contents

- [Access Control](#access-control)
- [Managing Rule Packs](#managing-rule-packs)
- [Configuring Rules](#configuring-rules)
- [Evidence Requirements](#evidence-requirements)
- [Activation and Versioning](#activation-and-versioning)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Access Control

### Role Requirements

Only users with the `ADMIN` role can:
- Create, edit, or delete rule packs
- Enable/disable rules
- Modify rule configurations
- Set evidence requirements
- Activate/deactivate rule packs

Teachers and Case Managers have **read-only** access to rule packs.

### API Security

All admin endpoints under `/api/admin/rule-packs` require:
1. Valid session (authentication)
2. `ADMIN` role (authorization)

Non-admin requests receive `403 Forbidden`.

## Managing Rule Packs

### Creating a Rule Pack

**Via API:**

```bash
POST /api/admin/rule-packs
Content-Type: application/json

{
  "scopeType": "STATE",
  "scopeId": "MD",
  "planType": "IEP",
  "name": "Maryland State IEP Rules",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": null,
  "isActive": true
}
```

**Via Admin UI:**

1. Navigate to `/admin/rules`
2. Click "New Rule Pack"
3. Select scope type and scope
4. Select plan type
5. Enter pack name
6. Set effective dates
7. Click "Create"

### Editing a Rule Pack

**Via API:**

```bash
PATCH /api/admin/rule-packs/:id
Content-Type: application/json

{
  "name": "Updated Pack Name",
  "effectiveTo": "2025-12-31"
}
```

### Deleting a Rule Pack

**Via API:**

```bash
DELETE /api/admin/rule-packs/:id
```

**Warning:** Deletion cascades to all rules and evidence requirements in the pack.

## Configuring Rules

### Adding a Rule to a Pack

```bash
POST /api/admin/rule-packs/:packId/rules
Content-Type: application/json

{
  "ruleDefinitionId": "uuid-of-rule-definition",
  "isEnabled": true,
  "config": {
    "days": 7
  },
  "sortOrder": 1
}
```

### Updating Rule Configuration

```bash
PATCH /api/admin/rule-packs/:packId/rules/:ruleId
Content-Type: application/json

{
  "isEnabled": true,
  "config": {
    "days": 10
  }
}
```

### Disabling a Rule

```bash
PATCH /api/admin/rule-packs/:packId/rules/:ruleId
Content-Type: application/json

{
  "isEnabled": false
}
```

### Removing a Rule

```bash
DELETE /api/admin/rule-packs/:packId/rules/:ruleId
```

## Evidence Requirements

### Adding Evidence Requirement

```bash
POST /api/admin/rule-packs/:packId/rules/:ruleId/evidence
Content-Type: application/json

{
  "evidenceTypeId": "uuid-of-evidence-type",
  "isRequired": true
}
```

### Removing Evidence Requirement

```bash
DELETE /api/admin/rule-packs/:packId/rules/:ruleId/evidence/:evidenceId
```

## Activation and Versioning

### Activation Constraint

Only **one** rule pack can be active per `(scopeType, scopeId, planType)` combination.

When activating a pack:
1. The system checks for existing active packs
2. If another pack is active, activation fails
3. Deactivate the existing pack first

### Version Numbers

- Versions auto-increment per scope+planType
- First pack: version 1
- Each new pack: previous max + 1
- Versions are immutable once created

### Activating a Pack

```bash
PATCH /api/admin/rule-packs/:id
Content-Type: application/json

{
  "isActive": true
}
```

### Deactivating a Pack

```bash
PATCH /api/admin/rule-packs/:id
Content-Type: application/json

{
  "isActive": false
}
```

## Common Tasks

### Create State-Level Rules

1. Create rule pack with `scopeType: STATE`
2. Add all required rules
3. Configure each rule's parameters
4. Set evidence requirements
5. Activate the pack

### Create District Override

1. Create rule pack with `scopeType: DISTRICT`
2. Add only rules that differ from state
3. Override configurations as needed
4. Activate the pack

The district pack will take precedence over state for schools in that district.

### Create School-Specific Rules

1. Create rule pack with `scopeType: SCHOOL`
2. Configure school-specific rules
3. Activate the pack

The school pack overrides both district and state.

### Update Document Delivery Days

```bash
PATCH /api/admin/rule-packs/:packId/rules/:preMeetingDocsRuleId
{
  "config": { "days": 7 }
}

PATCH /api/admin/rule-packs/:packId/rules/:postMeetingDocsRuleId
{
  "config": { "days": 7 }
}
```

### Disable Consent Gate (Not Recommended)

```bash
PATCH /api/admin/rule-packs/:packId/rules/:consentGateRuleId
{
  "config": { "enabled": false }
}
```

**Warning:** Disabling the consent gate removes FAPE compliance protection.

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `403 Forbidden` | User is not an admin | Ensure user has ADMIN role |
| `404 Rule pack not found` | Invalid pack ID | Verify the pack ID exists |
| `404 Rule definition not found` | Invalid rule definition ID | Use valid ID from `/api/rule-packs/definitions` |
| `404 Evidence type not found` | Invalid evidence type ID | Use valid ID from `/api/rule-packs/evidence-types` |
| `Duplicate active pack` | Another pack is already active for this scope | Deactivate existing pack first |
| `Version conflict` | Concurrent modification | Refresh and retry |

### Validation Errors

**Missing Required Fields:**
```json
{
  "error": "Validation failed",
  "details": [
    { "path": ["scopeId"], "message": "Required" }
  ]
}
```

**Invalid Enum Value:**
```json
{
  "error": "Validation failed",
  "details": [
    { "path": ["scopeType"], "message": "Invalid enum value" }
  ]
}
```

### Rule Pack Not Found in Resolution

**Symptoms:** Teachers report no enforcement rules apply.

**Diagnosis:**
```bash
GET /api/rules/context?studentId=...&planType=IEP
```

Check response:
- `resolved: false` = No pack found
- `precedence.searched` shows lookup order
- `precedence.matched` is null

**Solutions:**
1. Create a rule pack for the appropriate scope
2. Ensure `isActive: true`
3. Ensure `effectiveFrom <= now`
4. Ensure `effectiveTo IS NULL OR effectiveTo >= now`

### Rules Not Applying

**Symptoms:** Specific rule not enforced despite pack being active.

**Check:**
1. Is the rule attached to the pack?
2. Is `isEnabled: true` for that rule?
3. Is the config correct?

```bash
GET /api/admin/rule-packs/:id
```

Review `rules` array in response.

### Evidence Not Required

**Symptoms:** Meeting can close without expected evidence.

**Check:**
1. Is evidence type attached to the rule?
2. Is `isRequired: true`?

```bash
GET /api/admin/rule-packs/:id
```

Review `rules[].evidenceRequirements` array.

### Scope Precedence Issues

**Symptoms:** Wrong rule pack being applied.

**Explanation:**
- SCHOOL packs override DISTRICT
- DISTRICT packs override STATE
- The first active pack found in precedence order is used

**Check precedence:**
```bash
GET /api/rules/context?studentId=...&planType=IEP
```

Review:
- `precedence.searched` for lookup order
- `precedence.matched` for which scope matched

### Database Connection Issues

**Symptoms:** 500 errors on all admin endpoints.

**Check:**
1. Database is running
2. `DATABASE_URL` is correct
3. Prisma client is generated

```bash
pnpm db:generate
pnpm db:migrate
```

### Session/Auth Issues

**Symptoms:** 401 Unauthorized.

**Check:**
1. User is logged in
2. Session cookie is present
3. Session is not expired

Try logging out and back in.
