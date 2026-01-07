# MyTeacher Detailed User Guide

A comprehensive guide to all features of the MyTeacher Special Education Compliance Platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Student Management](#student-management)
4. [Plan Management](#plan-management)
5. [Goal Management](#goal-management)
6. [Service Logging](#service-logging)
7. [Behavior Plans](#behavior-plans)
8. [Meetings & Compliance](#meetings--compliance)
9. [Document Management](#document-management)
10. [Referrals & Evaluations](#referrals--evaluations)
11. [Dispute Cases](#dispute-cases)
12. [Reports & Exports](#reports--exports)
13. [Administration](#administration)

---

## Getting Started

### Logging In

1. Navigate to `https://myteacher-web.vercel.app`
2. Click **"Sign in with Google"**
3. Select your Google account
4. First-time users will be directed to the onboarding wizard

### Onboarding

New users must complete onboarding:

1. **Profile Setup**: Enter your display name
2. **Jurisdiction Selection**: Select your state, district, and school
3. **Role Confirmation**: Confirm your assigned role

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Teacher** | Classroom teachers with IEP responsibilities | Own students only |
| **Case Manager** | Special education coordinators | Assigned caseload |
| **Admin** | District/school administrators | All students and settings |
| **Related Service Provider** | Speech, OT, PT, counseling staff | Service logging only |
| **Read Only** | Observers, auditors | View access only |

---

## Dashboard Overview

The dashboard provides a quick overview of your responsibilities.

### Compliance Summary Cards

- **Reviews Due Soon**: Plan reviews coming due within 30 days
- **Overdue Reviews**: Reviews past their due date
- **Open Tasks**: Compliance tasks requiring attention
- **Urgent Items**: High-priority items needing immediate action

### Student List

- View all students in your caseload
- Filter by status (On Track, Watch, Concern, Urgent)
- Filter by plan type (IEP, 504, Behavior Plan)
- Click **"Open"** to view student details

### Admin Access (Admin Users Only)

Quick links to:
- Manage Users
- Manage Students
- Best Practice Docs
- Form Templates
- Plan Schemas

---

## Student Management

### Viewing a Student Profile

1. Click **"Open"** next to any student in your list
2. The student profile shows:
   - Basic information (name, grade, school, ID)
   - Current status badges
   - Active plans
   - Quick action buttons

### Student Status

Each student has status indicators:

| Status | Color | Meaning |
|--------|-------|---------|
| **On Track** | Green | Meeting all goals, services delivered |
| **Watch** | Yellow | Minor concerns, monitoring needed |
| **Concern** | Orange | Multiple issues requiring attention |
| **Urgent** | Red | Immediate intervention required |

**Updating Status:**
1. Click the status badge
2. Select new status
3. Add a summary note explaining the change
4. Click **"Update"**

### Creating a New Student (Admin Only)

1. Go to **Admin → Manage Students**
2. Click **"+ Add Student"**
3. Fill in required fields:
   - First Name, Last Name
   - Grade Level
   - School
   - Record ID
4. Click **"Create Student"**

---

## Plan Management

### Plan Types

| Type | Code | Description |
|------|------|-------------|
| **IEP** | IEP | Individualized Education Program |
| **504 Plan** | FIVE_OH_FOUR | Section 504 Accommodation Plan |
| **Behavior Plan** | BEHAVIOR_PLAN | Behavior Intervention Plan (BIP) |

### Creating a New Plan

1. Open student profile
2. Click **"+ New Plan"** button
3. Select plan type (IEP, 504, or BIP)
4. Enter start date
5. Click **"Create Plan"**

### Editing Plan Content

IEP and 504 plans have multiple sections:

1. Open the plan from student profile
2. Navigate between sections using the sidebar
3. Edit fields in each section
4. Changes save automatically

**Common IEP Sections:**
- Student Information
- Present Levels of Performance
- Goals & Objectives
- Special Education Services
- Related Services
- Accommodations
- Assessment Participation
- Transition (age 14+)
- Extended School Year

### Plan Versioning

Plans can be finalized and versioned:

1. Complete all required sections
2. Click **"Finalize Plan"**
3. Plan is snapshot as a version
4. New changes create a new working draft

---

## Goal Management

### Viewing Goals

1. Open student's plan
2. Click **"Goals"** in the sidebar
3. View all goals with:
   - Goal area (Reading, Math, etc.)
   - Current progress level
   - Target date
   - Latest progress notes

### Creating Goals with Goal Wizard

The AI-powered Goal Wizard helps create compliant goals:

1. Click **"+ Add Goal"** or **"Goal Wizard"**
2. **Step 1 - Present Levels**: Upload student work samples or enter present levels
3. **Step 2 - Goal Area**: Select the goal area (Reading, Writing, Math, etc.)
4. **Step 3 - AI Chat**: Describe what you want the student to achieve
5. **Step 4 - Review**: AI generates a draft goal with:
   - Measurable baseline
   - Measurable target
   - Method of measurement
   - Timeline
6. **Step 5 - Save**: Edit and save the goal

### Adding Objectives

Each goal can have short-term objectives:

1. Click on a goal to expand it
2. Click **"+ Add Objective"**
3. Enter objective description
4. Set target date
5. Click **"Save"**

### Recording Progress

1. Click **"Add Progress"** on any goal
2. Select progress level:
   - Not Addressed
   - Full Support Needed
   - Some Support Needed
   - Low Support Needed
   - Met Target
3. Add progress notes
4. Optionally use dictation (microphone button)
5. Click **"Save Progress"**

### Quick Progress Buttons

For rapid data entry:
1. Use the quick progress buttons on each goal
2. Select the appropriate level
3. Progress is recorded with timestamp

---

## Service Logging

### Recording Service Delivery

1. Open student's plan
2. Click **"Services"** in sidebar
3. Click **"+ Log Service"**
4. Enter:
   - Service type (Speech, OT, PT, etc.)
   - Date and duration (minutes)
   - Setting (Gen Ed, Resource Room, etc.)
   - Notes about the session
5. Click **"Save"**

### Service Types

| Type | Description |
|------|-------------|
| Special Education | Specialized instruction |
| Speech-Language | Speech therapy services |
| Occupational Therapy | OT services |
| Physical Therapy | PT services |
| Counseling | School counseling |
| Behavioral Support | Behavior intervention |
| Reading Specialist | Reading intervention |
| Paraprofessional | 1:1 or small group support |
| Other | Other related services |

### Viewing Service History

- All logged services appear in chronological order
- Filter by service type or date range
- View total minutes delivered vs. scheduled
- Identify service variance (under/over delivery)

---

## Behavior Plans

### Creating a Behavior Plan

1. From student profile, create a new Behavior Plan
2. Or access from existing IEP's behavior section

### Defining Behavior Targets

1. Click **"+ Add Target"**
2. Enter:
   - Target name (e.g., "Off-task behavior")
   - Operational definition
   - Examples of the behavior
   - Non-examples
   - Measurement type:
     - **Frequency**: Count occurrences
     - **Duration**: Time spent
     - **Interval**: Percentage of intervals
     - **Rating**: Scale rating (1-5)
3. Click **"Save Target"**

### Recording Behavior Events

1. Go to **Behavior → Data Entry**
2. Select the behavior target
3. For frequency: Click **"+ Add Event"** each occurrence
4. For duration: Enter start/end time
5. For interval/rating: Enter percentage or rating value
6. Add contextual notes
7. Events are timestamped automatically

### Viewing Behavior Data

- View charts showing trends over time
- Filter by date range
- Export data for analysis
- Compare baseline to current rates

---

## Meetings & Compliance

### Scheduling Meetings

1. Click **"+ Schedule Meeting"** from student or plan
2. Select meeting type:
   - Initial IEP
   - Annual Review
   - Amendment
   - Re-evaluation
   - Continued Meeting
3. Set date, time, and location
4. Add required attendees
5. Click **"Create Meeting"**

### Meeting Types

| Type | Description |
|------|-------------|
| Initial IEP | First IEP development meeting |
| Annual Review | Yearly IEP review |
| Amendment | Mid-year IEP changes |
| Re-evaluation | 3-year re-evaluation meeting |
| Continued | Multi-part meeting continuation |

### Meeting Evidence

Compliance rules may require evidence:

1. Open the meeting
2. Go to **"Evidence"** tab
3. Upload required documents:
   - Meeting invitation (with proof of delivery)
   - Prior Written Notice
   - Attendance sign-in sheet
   - Conference notes
4. Mark delivery method (Email, US Mail, Hand Delivery)

### Closing a Meeting

1. Click **"Close Meeting"**
2. System validates all required evidence
3. If compliant, meeting is marked complete
4. If non-compliant, system shows missing items

---

## Document Management

### Uploading Documents

1. Click **"+ Upload Document"**
2. Select document type
3. Choose file (PDF, Word, images)
4. Add description
5. Click **"Upload"**

### Best Practice Documents (Admin)

1. Go to **Admin → Best Practice Docs**
2. Upload exemplar documents
3. Documents are indexed for AI search
4. Teachers can reference during goal writing

### Form Templates

1. Go to **Admin → Form Templates**
2. View available templates
3. Templates are used for:
   - Meeting notices
   - Prior Written Notice
   - Progress reports
   - Custom forms

### Prior Plans

1. Open student profile
2. Click **"Prior Plans"** tab
3. Upload previous IEPs or evaluations
4. AI can analyze for present levels

---

## Referrals & Evaluations

### Creating a Referral

1. Open student profile
2. Click **"Referrals"** tab
3. Click **"+ New Referral"**
4. Select referral type:
   - IDEA (Special Education)
   - Section 504
5. Enter referral source and reason
6. Attach supporting documents
7. Click **"Submit Referral"**

### Referral Timeline

Track referral progress:
- Referral received
- Parent notification sent
- Consent obtained
- Evaluation scheduled
- Evaluation completed
- Eligibility meeting scheduled

### Evaluation Cases

1. From referral, click **"Create Evaluation Case"**
2. Add evaluation participants
3. Schedule assessments:
   - Cognitive
   - Academic
   - Speech/Language
   - OT/PT
   - Behavioral
4. Record assessment results
5. Document eligibility determination

---

## Dispute Cases

### Creating a Dispute Case

1. Open student profile
2. Click **"Cases"** tab
3. Click **"+ New Case"**
4. Select case type:
   - Section 504 Complaint
   - IEP Dispute
   - Records Request
   - Other
5. Enter summary and filed date
6. Click **"Create Case"**

### Case Timeline

Track case events:
1. Click **"+ Add Event"**
2. Select event type:
   - Intake
   - Meeting
   - Response Sent
   - Document Received
   - Resolution
   - Status Change
   - Note
3. Enter event details
4. Click **"Save"**

### Case Attachments

1. Click **"Attachments"** tab
2. Upload relevant documents
3. Add descriptions
4. Files are associated with the case

### Resolving Cases

1. Update status to "Resolved" or "Closed"
2. Add resolution notes
3. Document resolution date

---

## Reports & Exports

### IEP Reports

1. Open student's IEP
2. Click **"Create IEP Report"**
3. Select reporting period
4. Report includes:
   - Progress on all goals
   - Service delivery summary
   - Present levels update
5. Export as PDF

### Artifact Comparison Reports

1. Open **"Artifact Comparison"** section
2. Upload baseline document (e.g., September writing sample)
3. Upload comparison document (e.g., January writing sample)
4. AI analyzes growth and changes
5. Link to specific goals
6. Use in present levels documentation

### Plan Export

1. Open any plan
2. Click **"Export PDF"**
3. Plan is rendered as compliant document
4. Download or email to parents

### Audit Reports (Admin)

1. Go to **Admin → Audit Logs**
2. Filter by:
   - Date range
   - User
   - Action type
   - Student
3. Export audit trail as CSV

---

## Administration

### User Management

**Creating Users:**
1. Go to **Admin → Manage Users**
2. Click **"+ Add User"**
3. Enter email and display name
4. Select role
5. Assign jurisdiction
6. Click **"Create User"**

**Editing Users:**
1. Click on user name
2. Update role, permissions, or jurisdiction
3. Click **"Save Changes"**

### Student Assignment

**Assigning Students to Teachers:**
1. Open student profile
2. Click **"Assign Teacher"**
3. Select teacher from list
4. Click **"Assign"**

### Rule Pack Management

**Creating Rule Packs:**
1. Go to **Admin → Rules**
2. Click **"+ New Rule Pack"**
3. Enter name and description
4. Set scope (State, District, or School)
5. Add rules:
   - Pre-meeting document deadlines
   - Post-meeting document deadlines
   - Required evidence types
   - Consent requirements
6. Activate rule pack

### Schema Management

**Editing Plan Schemas:**
1. Go to **Admin → Plan Schemas**
2. Select schema to edit
3. Modify sections and fields
4. Set required/optional status
5. Add dropdown options
6. Changes apply to new plans

### Form Field Configuration

**Customizing Form Fields:**
1. Go to **Admin → Form Fields**
2. View all form field definitions
3. Add new fields for student intake
4. Configure field types and options
5. Set jurisdiction-specific requirements

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current form |
| `Ctrl/Cmd + Enter` | Submit form |
| `Escape` | Close modal/panel |

---

## Getting Help

- **In-app Help**: Click the ? icon for contextual help
- **Documentation**: Access from user menu
- **Support**: Contact your district administrator
- **Bugs/Issues**: Report at https://github.com/anthropics/claude-code/issues

---

## Glossary

| Term | Definition |
|------|------------|
| **IEP** | Individualized Education Program - legal document for students with disabilities |
| **504 Plan** | Section 504 accommodation plan for students with disabilities |
| **BIP** | Behavior Intervention Plan - addresses challenging behaviors |
| **FAPE** | Free Appropriate Public Education |
| **LRE** | Least Restrictive Environment |
| **PWN** | Prior Written Notice - required notification to parents |
| **ESY** | Extended School Year - summer services |
| **COMAR** | Code of Maryland Regulations |
| **MDT** | Multi-Disciplinary Team |
| **FBA** | Functional Behavior Assessment |

---

*Last Updated: January 2, 2026*
