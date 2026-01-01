# Creating a Rules Package - Step by Step Guide

This guide walks through the complete process of creating a new compliance rules package in MyTeacher.

## Prerequisites

- You must have **ADMIN** role to create and manage rule packs
- Access to the MyTeacher application at your organization's URL

## Overview

A **Rule Pack** is a collection of compliance rules that apply to a specific scope (state, district, or school) and plan type (IEP, 504, BIP). The system uses scope precedence to determine which rules apply: **School > District > State** (most specific wins).

---

## Step 1: Access the Rules Admin Interface

1. Log in to MyTeacher with an administrator account
2. Navigate to **Admin** in the main navigation
3. Click on **Rules** to open the Rules Management page

The interface has three main areas:
- **Left sidebar**: Filter controls and list of existing rule packs
- **Main panel**: Details for the selected rule pack
- **Tabs**: Overview, Rules, Evidence, and Preview

---

## Step 2: Create a New Rule Pack

### 2.1 Open the Create Dialog

Click the **"New"** button in the left sidebar to open the creation modal.

### 2.2 Fill in Basic Information

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Descriptive name for this rule pack | "Maryland State IEP Rules 2024" |
| **Scope Type** | Level at which rules apply | `STATE`, `DISTRICT`, or `SCHOOL` |
| **Scope ID** | Identifier for the scope | "MD" (state), "HCPSS" (district), or school UUID |
| **Plan Type** | Which plans these rules affect | `IEP`, `PLAN504`, `BIP`, or `ALL` |
| **Effective From** | Date when rules become active | 2024-07-01 |

### 2.3 Click Create

The system will:
- Auto-assign a version number (v1 for first pack in scope, v2, v3, etc. for subsequent)
- Create the pack in **inactive** state
- Automatically deactivate any conflicting active packs (if you activate this one later)

---

## Step 3: Configure Individual Rules

After creation, select your new rule pack from the left sidebar and go to the **Rules** tab.

### Available Rule Definitions

| Rule Key | Description | Default Config |
|----------|-------------|----------------|
| `INITIAL_IEP_CONSENT_GATE` | Require parent consent before initial IEP | `{ required: true }` |
| `ANNUAL_REVIEW_DAYS` | Days before IEP expires to trigger review | `{ days: 365 }` |
| `PRE_MEETING_DOCS_DAYS` | Business days to send docs before meeting | `{ days: 5 }` |
| `POST_MEETING_DOCS_DAYS` | Business days to send final docs after | `{ days: 5 }` |
| `CONTINUED_MEETING_NOTICE_DAYS` | Days notice for continued meetings | `{ days: 10 }` |
| `CONFERENCE_NOTES_REQUIRED` | Require conference notes for meetings | `{ required: true }` |
| `AUDIO_RECORDING_RULE` | Audio recording acknowledgment rules | `{ allowRecording: true, requireAck: true }` |

### 3.1 Enable Rules

For each rule you want to enforce:
1. Check the **Enabled** checkbox
2. Review the default configuration
3. Modify the config JSON if needed (click the config field to edit)

### 3.2 Save Configuration

Click **Save** to persist your rule selections.

---

## Step 4: Set Evidence Requirements

Navigate to the **Evidence** tab to configure what documentation is required for each rule.

### Evidence Types

| Evidence Type | Related Rule | Description |
|--------------|--------------|-------------|
| `CONSENT_FORM` | `INITIAL_IEP_CONSENT_GATE` | Parent consent signature |
| `CONFERENCE_NOTES` | `CONFERENCE_NOTES_REQUIRED` | Meeting notes documentation |
| `NOTICE_WAIVER` | `CONTINUED_MEETING_NOTICE_DAYS` | Waiver of notice period |
| `RECORDING_ACK` | `AUDIO_RECORDING_RULE` | Recording acknowledgment form |
| `PARENT_DOCS_SENT` | `PRE_MEETING_DOCS_DAYS` | Pre-meeting document delivery |
| `FINAL_DOC_SENT` | `POST_MEETING_DOCS_DAYS` | Post-meeting document delivery |

### 4.1 Configure Evidence via API

Evidence requirements are typically configured via the API:

```bash
PUT /api/admin/rule-packs/{packId}/evidence
Content-Type: application/json

{
  "updates": [
    {
      "ruleId": "rule-uuid-for-consent-gate",
      "evidenceRequirements": [
        { "evidenceTypeId": "consent-form-uuid", "isRequired": true }
      ]
    }
  ]
}
```

---

## Step 5: Preview and Validate

Go to the **Preview** tab to see the complete JSON structure of your rule pack.

### Check for:
- All intended rules are enabled
- Config values are correct
- Evidence requirements are properly linked
- Effective dates are set correctly

---

## Step 6: Activate the Rule Pack

### 6.1 Toggle Active Status

In the **Overview** tab:
1. Check the **Active** checkbox
2. Click **Save**

### 6.2 Understand Activation

When you activate a rule pack:
- Only **one pack can be active** per `(scopeType, scopeId, planType)` combination
- The system automatically deactivates any conflicting active packs
- The pack must be within its effective date range to apply

### 6.3 Verify Activation

The rule pack should now show as "Active" in the sidebar list.

---

## Scope Precedence

When the system evaluates which rules apply to a student/plan, it follows this precedence:

1. **School-specific rules** (highest priority)
2. **District rules** (if no school rules exist)
3. **State rules** (fallback)

If no active pack is found at any level, **system defaults** are used.

### Example

A student at Atholton High School (HCPSS, Maryland):
1. System first looks for active pack: `scopeType=SCHOOL, scopeId=atholton-uuid, planType=IEP`
2. If not found, looks for: `scopeType=DISTRICT, scopeId=HCPSS, planType=IEP`
3. If not found, looks for: `scopeType=STATE, scopeId=MD, planType=IEP`
4. If not found, uses system defaults

---

## Common Scenarios

### Creating State-Level Rules

```
Name: "Maryland State IEP Compliance Rules"
Scope Type: STATE
Scope ID: MD
Plan Type: IEP
```

This creates baseline rules for all IEPs in Maryland.

### Creating District Override

```
Name: "Howard County IEP Override - Extended Doc Timeline"
Scope Type: DISTRICT
Scope ID: HCPSS
Plan Type: IEP
```

Configure with different `PRE_MEETING_DOCS_DAYS` to override state defaults.

### Creating School-Specific Rules

```
Name: "Atholton HS - Behavior Plan Rules"
Scope Type: SCHOOL
Scope ID: [school UUID from database]
Plan Type: BIP
```

---

## Version Management

- **Versions are auto-incremented** per `(scopeType, scopeId, planType)`
- First pack = v1, next = v2, etc.
- Versions are **immutable** once created
- When a meeting is closed, the active pack version is recorded in the audit trail

### Creating a New Version

To update rules while preserving history:
1. Create a new rule pack with the same scope/planType
2. System auto-assigns next version number
3. Configure new rules
4. Activate the new pack (automatically deactivates old version)

---

## API Reference

### Create Rule Pack

```bash
POST /api/admin/rule-packs
Content-Type: application/json

{
  "name": "Maryland State IEP Rules",
  "scopeType": "STATE",
  "scopeId": "MD",
  "planTypeCode": "IEP",
  "effectiveFrom": "2024-07-01"
}
```

### Bulk Update Rules

```bash
PUT /api/admin/rule-packs/{id}/rules
Content-Type: application/json

{
  "rules": [
    {
      "ruleKey": "PRE_MEETING_DOCS_DAYS",
      "isEnabled": true,
      "config": { "days": 7 }
    },
    {
      "ruleKey": "CONFERENCE_NOTES_REQUIRED",
      "isEnabled": true,
      "config": { "required": true }
    }
  ]
}
```

### Activate Pack

```bash
PATCH /api/admin/rule-packs/{id}
Content-Type: application/json

{
  "isActive": true
}
```

---

## Troubleshooting

### Rules Not Being Applied

1. **Check pack is active**: Verify `isActive = true`
2. **Check effective dates**: Pack must be within `effectiveFrom` to `effectiveTo` range
3. **Check scope precedence**: A more specific scope may be overriding
4. **Check plan type**: Ensure pack matches the plan type or is set to `ALL`

### Wrong Pack Being Used

1. Query the rules context API to see which pack is resolved:
   ```
   GET /api/rules/context?studentId={id}&planTypeCode=IEP
   ```
2. Check the `activeRulePack` in the response
3. Verify scope hierarchy is correct

### Evidence Not Enforced

1. Ensure the rule is **enabled** in the pack
2. Verify evidence type is linked to the rule with `isRequired: true`
3. Check the meeting enforcement endpoint for specific errors

---

## Related Documentation

- [Rules Engine Technical Documentation](./rules-engine.md)
- [Rules Database Schema](./rules-schema.md)
- [Admin Guide](./admin.md)
- [Compliance Rules Overview](./rules.md)
