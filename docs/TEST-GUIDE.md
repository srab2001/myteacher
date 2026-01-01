# MyTeacher Feature Test Guide

This guide provides step-by-step instructions for testing all new features in MyTeacher v1.3-1.4.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Test Accounts](#test-accounts)
- [Feature 1: Dispute Cases](#feature-1-dispute-cases)
- [Feature 2: Audit Log](#feature-2-audit-log)
- [Feature 3: Review Scheduling](#feature-3-review-scheduling)
- [Feature 4: Compliance Tasks](#feature-4-compliance-tasks)
- [Feature 5: In-App Alerts](#feature-5-in-app-alerts)
- [Integration Tests](#integration-tests)
- [Edge Cases](#edge-cases)

---

## Prerequisites

1. Application is running locally or deployed
2. Database has been migrated with latest schema
3. Test users exist with different roles

```bash
# Start local development
cd apps/api && pnpm dev
cd apps/web && pnpm dev
```

---

## Test Accounts

| Role | Email | Can Access |
|------|-------|------------|
| ADMIN | admin@test.com | All features |
| CASE_MANAGER | casemanager@test.com | Cases, Compliance Tasks, Alerts |
| TEACHER | teacher@test.com | Dashboard, Plans, Goals, Alerts |
| READ_ONLY | readonly@test.com | View-only access |

---

## Feature 1: Dispute Cases

**Access:** ADMIN, CASE_MANAGER only

### Test 1.1: Access Cases Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as ADMIN or CASE_MANAGER | Dashboard loads |
| 2 | Navigate to any student | Student detail page loads |
| 3 | Look for "Cases" in navigation | Cases link visible |
| 4 | Click "Cases" | Cases list page loads at `/students/{id}/cases` |

### Test 1.2: Cases Tab Not Visible for Teachers

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as TEACHER | Dashboard loads |
| 2 | Navigate to any student | Student detail page loads |
| 3 | Look for "Cases" in navigation | Cases link NOT visible |
| 4 | Try direct URL `/students/{id}/cases` | Redirected to student page |

### Test 1.3: Create New Case

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On Cases page, click "New Case" | Modal opens |
| 2 | Select Type: "IEP Dispute" | Type selected |
| 3 | Select Related Plan (optional) | Plan selected from dropdown |
| 4 | Set Intake Date | Date picker works |
| 5 | Enter Summary: "Test dispute case" | Text entered |
| 6 | Click "Create" | Modal closes, redirected to case detail |
| 7 | Verify case number generated | Case number like "DC-2024-0001" visible |

### Test 1.4: View Case Detail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a case | Case detail page loads |
| 2 | Verify header shows case number and type | Both visible |
| 3 | Verify status badge displays | Badge with color visible |
| 4 | Verify meta section (Owner, Intake Date) | All fields display |
| 5 | Verify Summary section | Summary text visible |
| 6 | Verify Timeline section | "No events" or event list |
| 7 | Verify Attachments section | "No attachments" or file list |

### Test 1.5: Edit Case

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On case detail, click "Edit" | Edit modal opens |
| 2 | Change Status to "In Review" | Dropdown changes |
| 3 | Update Summary | Text updates |
| 4 | Click "Save" | Modal closes, page updates |
| 5 | Verify status badge updated | Shows "In Review" with orange color |

### Test 1.6: Add Timeline Event

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On case detail, click "Add Event" | Add Event modal opens |
| 2 | Select Event Type: "Meeting" | Type selected |
| 3 | Set Date | Date selected |
| 4 | Enter Summary: "Initial team meeting" | Text entered |
| 5 | Enter Details (optional) | Text entered |
| 6 | Click "Add Event" | Modal closes, event appears in timeline |
| 7 | Verify event icon shows 👥 | Meeting icon displays |

### Test 1.7: Resolve Case

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Edit" on case | Modal opens |
| 2 | Change Status to "Resolved" | Resolution Summary field appears |
| 3 | Enter Resolution Summary | Text entered |
| 4 | Click "Save" | Modal closes |
| 5 | Verify Resolution section visible | Shows resolution summary with date |

### Test 1.8: Case Types

Test all case types work:

| Type | Test |
|------|------|
| SECTION504_COMPLAINT | Create case, verify "504 Complaint" label |
| IEP_DISPUTE | Create case, verify "IEP Dispute" label |
| RECORDS_REQUEST | Create case, verify "Records Request" label |
| OTHER | Create case, verify "Other" label |

---

## Feature 2: Audit Log

**Access:** ADMIN only

### Test 2.1: Access Audit Log

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as ADMIN | Dashboard loads |
| 2 | Navigate to Admin area | Admin dashboard loads |
| 3 | Click "Audit Log" in sidebar | Audit page loads at `/admin/audit` |

### Test 2.2: Audit Log Not Visible for Non-Admins

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as CASE_MANAGER | Dashboard loads |
| 2 | Navigate to Admin area | Redirected to dashboard |
| 3 | Try direct URL `/admin/audit` | Redirected to dashboard |

### Test 2.3: Generate Audit Events

Perform these actions to create audit entries:

| Action | How to Trigger | Expected Log Entry |
|--------|----------------|-------------------|
| Plan Viewed | Open any plan | PLAN_VIEWED |
| Plan Finalized | Finalize a plan version | PLAN_FINALIZED |
| PDF Downloaded | Download plan PDF | PDF_DOWNLOADED |
| Signature Added | Sign a document | SIGNATURE_ADDED |
| Case Viewed | Open a dispute case | CASE_VIEWED |

### Test 2.4: Filter Audit Logs

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set Date From to yesterday | Date filter applied |
| 2 | Set Date To to today | Date filter applied |
| 3 | Click "Run" | Results filtered by date |
| 4 | Select a User from dropdown | User filter selected |
| 5 | Click "Run" | Results filtered by user |
| 6 | Select Action: "Plan Finalized" | Action filter selected |
| 7 | Click "Run" | Only PLAN_FINALIZED entries show |
| 8 | Enter Student ID | Student filter applied |
| 9 | Click "Run" | Only entries for that student |

### Test 2.5: View Audit Detail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click any row in results | Detail drawer slides in |
| 2 | Verify Time displays | Full timestamp shown |
| 3 | Verify User info | Name, email, role visible |
| 4 | Verify Action badge | Action type with styling |
| 5 | Verify Entity info | Entity type and ID |
| 6 | Verify IP Address | IP shown or "—" |
| 7 | Verify User Agent | Browser info or "—" |
| 8 | Check Metadata (if present) | JSON displayed formatted |
| 9 | Click X or outside drawer | Drawer closes |

### Test 2.6: Export CSV

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Apply any filters | Results show |
| 2 | Click "Export CSV" | Download starts |
| 3 | Open downloaded file | CSV contains columns: Timestamp, User, User Email, Action, Entity Type, Entity ID, Student ID, Plan ID, IP Address, User Agent |
| 4 | Verify data matches filters | Exported data respects filters |

### Test 2.7: Pagination

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure >50 audit entries exist | Multiple pages available |
| 2 | Verify "Page 1 of X" shows | Pagination info visible |
| 3 | Click "Next" | Page 2 loads |
| 4 | Click "Previous" | Page 1 loads |
| 5 | Verify record count | Total count accurate |

### Test 2.8: PLAN_VIEWED Deduplication

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a plan | Audit entry created |
| 2 | Refresh the plan page | No duplicate entry (same session) |
| 3 | Wait 15+ minutes or log out/in | |
| 4 | Open same plan | New audit entry created |

---

## Feature 3: Review Scheduling

**Access:** ADMIN, CASE_MANAGER, TEACHER

### Test 3.1: Create Review Schedule

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a student's plan | Plan page loads |
| 2 | Find "Review Schedule" section | Section visible |
| 3 | Click "Add Review" | Form or modal opens |
| 4 | Set review date | Date selected |
| 5 | Set review type | Type selected |
| 6 | Add notes (optional) | Text entered |
| 7 | Save | Schedule created, appears in list |

### Test 3.2: View Upcoming Reviews

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to plan with scheduled reviews | Reviews visible |
| 2 | Verify date and type display | All info shows |
| 3 | Verify upcoming reviews highlighted | Visual indicator for soon |

### Test 3.3: Edit/Delete Review

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on review | Edit form opens |
| 2 | Change date | Date updates |
| 3 | Save | Changes saved |
| 4 | Click delete on review | Confirmation prompt |
| 5 | Confirm delete | Review removed |

---

## Feature 4: Compliance Tasks

**Access:** ADMIN, CASE_MANAGER

### Test 4.1: View Compliance Tasks

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to compliance tasks area | Task list visible |
| 2 | Verify task columns: Title, Due Date, Assignee, Status, Priority | All columns show |

### Test 4.2: Create Compliance Task

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Task" | Form opens |
| 2 | Enter title | Text entered |
| 3 | Set due date | Date selected |
| 4 | Assign to user | User selected |
| 5 | Set priority | Priority selected |
| 6 | Link to student (optional) | Student linked |
| 7 | Save | Task created, appears in list |

### Test 4.3: Update Task Status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on task | Task detail or edit opens |
| 2 | Change status: pending → in_progress | Status updates |
| 3 | Save | Status saved |
| 4 | Change status: in_progress → completed | Status updates |
| 5 | Save | Task marked complete |

### Test 4.4: Filter Tasks

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by assignee | Only their tasks show |
| 2 | Filter by status | Only matching tasks show |
| 3 | Filter by priority | Only matching tasks show |

---

## Feature 5: In-App Alerts

**Access:** All authenticated users

### Test 5.1: View Alert Bell

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as any user | Dashboard loads |
| 2 | Locate bell icon in header | Bell icon visible |
| 3 | Verify unread count badge | Number shows if unread alerts |

### Test 5.2: View Alerts List

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click bell icon | Alerts dropdown or page opens |
| 2 | Verify alerts listed | Title, date, type visible |
| 3 | Unread alerts styled differently | Bold or highlighted |

### Test 5.3: Mark Alert as Read

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on unread alert | Alert marked as read |
| 2 | Verify styling changes | No longer bold/highlighted |
| 3 | Verify badge count decreases | Count updates |

### Test 5.4: Mark All as Read

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Mark all as read" | All alerts marked read |
| 2 | Badge disappears or shows 0 | Count resets |

### Test 5.5: Alert Types

| Alert Type | Trigger | Test |
|------------|---------|------|
| REVIEW_DUE | Review schedule approaching | Verify alert shows |
| COMPLIANCE_OVERDUE | Task past due date | Verify alert shows |
| CASE_UPDATE | Case status changed | Verify alert shows |
| MEETING_REMINDER | Meeting scheduled | Verify alert shows |

---

## Integration Tests

### Test I-1: Case Creation Generates Audit Log

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a new case | Case created |
| 2 | View case detail | Case opens |
| 3 | Check audit log as ADMIN | CASE_VIEWED entry exists |

### Test I-2: Plan Finalize Generates Audit Log

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Finalize a plan version | Version finalized |
| 2 | Check audit log as ADMIN | PLAN_FINALIZED entry exists |
| 3 | Verify student and plan IDs in entry | Both IDs present |

### Test I-3: Review Schedule Creates Alert

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create review schedule for tomorrow | Schedule created |
| 2 | Check alerts | REVIEW_DUE alert appears |

### Test I-4: Overdue Task Creates Alert

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create task with yesterday's due date | Task created |
| 2 | Check alerts | COMPLIANCE_OVERDUE alert appears |

---

## Edge Cases

### EC-1: Empty States

| Test | Action | Expected |
|------|--------|----------|
| No cases | View cases for student with no cases | "No cases found" message, "Create First Case" button |
| No events | View case with no events | "No events recorded" message |
| No attachments | View case with no attachments | "No attachments uploaded" message |
| No audit logs | Filter to impossible criteria | "No audit records found" message |

### EC-2: Permission Denied

| Test | Action | Expected |
|------|--------|----------|
| Teacher views cases URL | Direct URL to `/students/{id}/cases` | Redirect to student page |
| Non-admin views audit | Direct URL to `/admin/audit` | Redirect to dashboard |

### EC-3: Invalid Data

| Test | Action | Expected |
|------|--------|----------|
| Create case without summary | Leave summary empty, click Create | Button disabled or validation error |
| Add event without summary | Leave summary empty, click Add | Button disabled or validation error |
| Invalid date filter | Set Date From after Date To | No results or validation |

### EC-4: Session Handling

| Test | Action | Expected |
|------|--------|----------|
| Session expires | Wait for session timeout | Redirect to login on next action |
| Role change | Admin changes user role mid-session | New permissions on page refresh |

---

## Test Checklist

Use this checklist to track test completion:

### Dispute Cases
- [ ] 1.1 Access Cases Tab (ADMIN)
- [ ] 1.1 Access Cases Tab (CASE_MANAGER)
- [ ] 1.2 Cases Tab hidden (TEACHER)
- [ ] 1.3 Create New Case
- [ ] 1.4 View Case Detail
- [ ] 1.5 Edit Case
- [ ] 1.6 Add Timeline Event
- [ ] 1.7 Resolve Case
- [ ] 1.8 All Case Types

### Audit Log
- [ ] 2.1 Access Audit Log (ADMIN)
- [ ] 2.2 Audit hidden (non-ADMIN)
- [ ] 2.3 Generate Audit Events
- [ ] 2.4 Filter Audit Logs
- [ ] 2.5 View Audit Detail
- [ ] 2.6 Export CSV
- [ ] 2.7 Pagination
- [ ] 2.8 PLAN_VIEWED Deduplication

### Review Scheduling
- [ ] 3.1 Create Review Schedule
- [ ] 3.2 View Upcoming Reviews
- [ ] 3.3 Edit/Delete Review

### Compliance Tasks
- [ ] 4.1 View Compliance Tasks
- [ ] 4.2 Create Compliance Task
- [ ] 4.3 Update Task Status
- [ ] 4.4 Filter Tasks

### In-App Alerts
- [ ] 5.1 View Alert Bell
- [ ] 5.2 View Alerts List
- [ ] 5.3 Mark Alert as Read
- [ ] 5.4 Mark All as Read
- [ ] 5.5 Alert Types

### Integration
- [ ] I-1 Case Creation Audit
- [ ] I-2 Plan Finalize Audit
- [ ] I-3 Review Schedule Alert
- [ ] I-4 Overdue Task Alert

### Edge Cases
- [ ] EC-1 Empty States
- [ ] EC-2 Permission Denied
- [ ] EC-3 Invalid Data
- [ ] EC-4 Session Handling

---

## Reporting Issues

When reporting test failures, include:

1. **Test ID** (e.g., "Test 1.3 - Create New Case")
2. **Steps to reproduce**
3. **Expected result**
4. **Actual result**
5. **Screenshots/console errors**
6. **Browser and OS**
7. **User role used**
