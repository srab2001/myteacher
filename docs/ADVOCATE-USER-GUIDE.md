# Advocate - Maryland Special Education Tools User Guide

## Getting Started

Advocate is a suite of 4 tools designed to help parents and advocates navigate Maryland's special education system. Access the app at your deployed Vercel URL.

### Home Dashboard

The home page displays cards for each tool. Click any card to navigate to that tool.

---

## Tool 1: Timeline & Compliance Tracker

**Route:** `/cases`

Track your child's special education process with automatic deadline calculations based on Maryland COMAR 13A.05.01 regulations.

### Creating a Case

1. Navigate to `/cases`
2. Click **New Case**
3. Fill in:
   - **Student Alias** (e.g., initials or nickname for privacy)
   - **Grade** (current grade level)
   - **School** and **District**
   - **Plan Type**: IEP, 504, or Unknown
4. Click **Create Case**

### Adding Events

Events trigger automatic deadline calculations:

1. Open a case from the cases list
2. Click **Add Event**
3. Select the event type:
   - **Referral** - When the school received the referral
   - **Consent Received** - When you signed consent for evaluation
   - **Evaluation Completed** - When testing was finished
   - **IEP Meeting** - Date of the IEP team meeting
   - **Annual Review** - Annual IEP review date
   - **Triennial Reevaluation** - 3-year reevaluation date
   - **IEP Amendment** - Any IEP changes
   - **Transition Meeting** - Transition planning meeting
4. Enter the date and any notes
5. Click **Save Event**

### Automatic Deadlines

When you add events, the system calculates deadlines per Maryland law:

| When You Add | System Creates | Rule |
|-------------|---------------|------|
| Consent date | Evaluation Due | 60 calendar days |
| Evaluation date | IEP Meeting Due | 30 calendar days |
| Evaluation date | Triennial Due | 3 years |
| IEP Meeting date | Annual Review Due | 365 days |
| Annual Review date | Next Annual Review | 365 days |
| Triennial date | Next Triennial | 3 years |

### Deadline Status Colors

- **Red (Overdue)**: Deadline has passed
- **Orange (Urgent)**: 7 days or less remaining
- **Yellow (Warning)**: 8-14 days remaining
- **Green (Normal)**: More than 14 days remaining

### Updating Deadline Status

Click on any deadline to update its status:
- **Pending**: Not yet completed
- **Met**: Deadline was met on time
- **Missed**: Deadline was not met
- **Waived**: Deadline was waived by agreement

---

## Tool 2: IEP/Evaluation Document Review

**Route:** `/cases/[id]` (within a case, upload documents)

Upload IEP or evaluation documents for AI-powered compliance review.

### Uploading Documents

1. Open a case
2. Click **Upload Document**
3. Select file type:
   - Notice, IEP, Evaluation, 504 Plan, Progress Report, Correspondence, Other
4. Choose your PDF file
5. Click **Upload**

### Running a Review

1. After uploading, click **Run Review** on the document
2. Select review type:
   - **IEP Review**: Checks all COMAR-required IEP components
   - **Evaluation Review**: Verifies evaluation completeness
   - **504 Review**: Checks Section 504 plan compliance
   - **Compliance Check**: General regulatory compliance
3. Wait for the AI analysis to complete

### Understanding Review Results

The review report includes:
- **Score**: 0-100% compliance rating
- **Summary**: Overview of findings
- **Component Checklist**: Each required section marked as present/missing
- **SMART Goal Analysis**: Goals checked for Specific, Measurable, Achievable, Relevant, Time-bound
- **Suggested Questions**: Questions to ask the IEP team
- **COMAR Citations**: Specific regulation references

---

## Tool 3: Maryland Rules Q&A

**Route:** `/qa`

Ask questions about Maryland special education law and receive cited answers from the knowledge base.

### Asking Questions

1. Navigate to `/qa`
2. Type your question in the chat box, for example:
   - "How many days does the school have to complete an evaluation?"
   - "What are the required components of an IEP in Maryland?"
   - "Can I request an Independent Educational Evaluation?"
   - "What are my rights if I disagree with the IEP?"
3. Press **Send**

### Understanding Answers

Each answer includes:
- **Response**: AI-generated answer based on Maryland regulations
- **Citations**: Source documents referenced (COMAR sections, MSDE bulletins, IDEA)
- **Confidence**: How well the sources match your question

### Knowledge Base Sources

The Q&A system searches across:
- **COMAR 13A.05.01** - Maryland special education regulations
- **MSDE Bulletins** - Maryland State Department of Education guidance
- **IDEA** - Federal Individuals with Disabilities Education Act
- **Section 504** - Federal Section 504 requirements
- **County Policies** - Local school district policies

### Conversation History

- Conversations are saved automatically
- Continue previous conversations from the sidebar
- Each conversation maintains context for follow-up questions

---

## Tool 4: Meeting Preparation Builder

**Route:** `/meeting-prep`

Generate professional meeting materials for IEP meetings.

### Creating Meeting Prep

1. Navigate to `/meeting-prep`
2. Select **Meeting Type**:
   - **Initial** - First IEP meeting
   - **Annual** - Annual IEP review
   - **Triennial** - 3-year reevaluation
   - **Revision** - IEP amendment meeting
3. Enter the **Meeting Date**
4. Fill out the guided form:
   - Your concerns about your child
   - Specific areas you want discussed
   - Questions you have
   - Goals you want to propose
5. Click **Generate Materials**

### Generated Materials

The system creates:

1. **Meeting Agenda**: Time-allocated agenda covering all discussion items
2. **Parent Concerns Letter**: Formal letter citing IDEA regulations, ready to send to the school
3. **Question List**: 10-15 targeted questions for the IEP team based on your concerns
4. **Email Templates**: Records request and follow-up email drafts

### Exporting Materials

- Click **Export** to download materials as formatted documents
- Print or email to the school team before the meeting

---

## Tips for Parents

1. **Start with a case**: Create a case first, then upload documents and track timelines
2. **Add events as they happen**: Enter dates the same day to keep deadlines accurate
3. **Upload documents before meetings**: Get AI review results to prepare questions
4. **Use Q&A for research**: Ask specific questions about your rights before meetings
5. **Generate meeting prep early**: Send the parent concerns letter at least 5 days before the meeting

## Environment Variables Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | Neon PostgreSQL connection string | neon.tech |
| `OPENAI_API_KEY` | OpenAI API key for AI features | platform.openai.com |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Vercel dashboard |
| `WORKER_API_URL` | Python worker service URL | Your Render/Railway deployment |

## Support

For technical issues, visit the GitHub repository: https://github.com/srab2001/advocate
