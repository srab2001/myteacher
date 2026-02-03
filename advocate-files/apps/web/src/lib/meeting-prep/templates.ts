/**
 * Meeting Preparation Templates for Maryland Special Education Tools
 */

export type MeetingType = 'initial' | 'annual' | 'triennial' | 'revision';

export interface Concern {
  area: string;
  description: string;
}

export interface MeetingPrepInput {
  caseId: string;
  studentAlias: string;
  meetingType: MeetingType;
  meetingDate: string;
  attendees: string[];
  concerns: Concern[];
  desiredOutcomes: string[];
  recentEvaluations: string[];
  currentChallenges: string;
  currentServices?: string;
  whatsWorking?: string;
  whatsNotWorking?: string;
}

export interface AgendaItem {
  title: string;
  duration: number; // minutes
  description: string;
  presenter?: string;
}

export interface GeneratedMaterials {
  agenda: {
    items: AgendaItem[];
    totalDuration: number;
    meetingDate: string;
    meetingType: MeetingType;
  };
  questions: string[];
  parentConcernsLetter: string;
  recordsRequestEmail: string;
  followUpEmail: string;
}

// Meeting type display names
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  initial: 'Initial IEP Meeting',
  annual: 'Annual IEP Review',
  triennial: 'Triennial Reevaluation',
  revision: 'IEP Revision Meeting',
};

// Common desired outcomes for checklist
export const COMMON_DESIRED_OUTCOMES = [
  'Clear understanding of current academic levels',
  'Appropriate annual goals established',
  'Adequate services and supports identified',
  'Placement in least restrictive environment',
  'Clear progress monitoring plan',
  'Parent input incorporated into IEP',
  'Extended School Year (ESY) considered',
  'Transition services discussed (if applicable)',
  'Assistive technology needs addressed',
  'Behavior support plan reviewed/updated',
];

// Common concern areas
export const COMMON_CONCERN_AREAS = [
  'Academic Progress',
  'Reading Skills',
  'Math Skills',
  'Writing Skills',
  'Communication',
  'Social Skills',
  'Behavior',
  'Attention/Focus',
  'Motor Skills',
  'Self-Care/Daily Living',
  'Transition Planning',
  'Service Delivery',
  'Placement',
  'Parent Communication',
];

/**
 * Generate the prompt for GPT-4o to create meeting materials
 */
export function generateMeetingPrepPrompt(input: MeetingPrepInput): string {
  const concernsList = input.concerns
    .map((c) => `- ${c.area}: ${c.description}`)
    .join('\n');

  const outcomesList = input.desiredOutcomes.map((o) => `- ${o}`).join('\n');

  const evaluationsList = input.recentEvaluations.map((e) => `- ${e}`).join('\n');

  return `You are an expert special education advocate helping a parent prepare for an IEP meeting in Maryland.

MEETING DETAILS:
- Type: ${MEETING_TYPE_LABELS[input.meetingType]}
- Date: ${input.meetingDate}
- Student: ${input.studentAlias}
- Attendees: ${input.attendees.join(', ')}

PARENT'S CONCERNS:
${concernsList}

DESIRED OUTCOMES:
${outcomesList}

RECENT EVALUATIONS:
${evaluationsList || 'None specified'}

CURRENT CHALLENGES:
${input.currentChallenges}

${input.currentServices ? `CURRENT SERVICES:\n${input.currentServices}` : ''}

${input.whatsWorking ? `WHAT'S WORKING:\n${input.whatsWorking}` : ''}

${input.whatsNotWorking ? `WHAT'S NOT WORKING:\n${input.whatsNotWorking}` : ''}

Please generate the following materials in JSON format:

1. MEETING AGENDA: Create a detailed agenda with time allocations (total meeting time: 60-90 minutes). Include standard IEP meeting components plus time for parent concerns.

2. QUESTIONS FOR THE IEP TEAM: Generate 10-15 specific, actionable questions the parent should ask during the meeting based on their concerns and desired outcomes.

3. PARENT CONCERNS LETTER: Write a formal letter documenting the parent's concerns that can be submitted to the school before or during the meeting. This should be professional, clear, and reference relevant special education law where appropriate.

4. RECORDS REQUEST EMAIL: Write a professional email template the parent can use to request relevant educational records before the meeting.

5. FOLLOW-UP EMAIL: Write a template for following up after the meeting to confirm what was discussed and any action items.

Return the response as a JSON object with this structure:
{
  "agenda": {
    "items": [
      {"title": "string", "duration": number, "description": "string", "presenter": "string or null"}
    ],
    "totalDuration": number
  },
  "questions": ["string"],
  "parentConcernsLetter": "string (full letter text)",
  "recordsRequestEmail": "string (full email text)",
  "followUpEmail": "string (full email template)"
}`;
}

/**
 * Default agenda template based on meeting type
 */
export function getDefaultAgenda(meetingType: MeetingType): AgendaItem[] {
  const baseItems: AgendaItem[] = [
    {
      title: 'Welcome and Introductions',
      duration: 5,
      description: 'Team members introduce themselves and their roles',
    },
    {
      title: 'Purpose of Meeting',
      duration: 5,
      description: `Review the purpose of the ${MEETING_TYPE_LABELS[meetingType]}`,
    },
    {
      title: 'Review of Rights',
      duration: 5,
      description: 'Review procedural safeguards and parent rights',
    },
  ];

  const meetingSpecificItems: Record<MeetingType, AgendaItem[]> = {
    initial: [
      {
        title: 'Review Evaluation Results',
        duration: 15,
        description: 'Discuss evaluation findings and eligibility determination',
      },
      {
        title: 'Determine Eligibility',
        duration: 10,
        description: 'Team decision on special education eligibility',
      },
      {
        title: 'Develop Initial IEP',
        duration: 30,
        description: 'Create goals, services, and placement decisions',
      },
    ],
    annual: [
      {
        title: 'Review Current IEP Progress',
        duration: 15,
        description: 'Discuss progress on current goals and objectives',
      },
      {
        title: 'Parent Input',
        duration: 10,
        description: 'Parent shares concerns and observations from home',
      },
      {
        title: 'Develop New Annual Goals',
        duration: 20,
        description: 'Create goals for the upcoming year',
      },
      {
        title: 'Review Services and Placement',
        duration: 10,
        description: 'Discuss and adjust services as needed',
      },
    ],
    triennial: [
      {
        title: 'Review Reevaluation Results',
        duration: 20,
        description: 'Discuss findings from triennial evaluation',
      },
      {
        title: 'Continued Eligibility Discussion',
        duration: 10,
        description: 'Determine continued eligibility for services',
      },
      {
        title: 'Update Present Levels',
        duration: 15,
        description: 'Revise present levels based on new data',
      },
      {
        title: 'Develop New Goals',
        duration: 15,
        description: 'Create goals based on evaluation results',
      },
    ],
    revision: [
      {
        title: 'Reason for Revision',
        duration: 10,
        description: 'Discuss why the IEP revision is needed',
      },
      {
        title: 'Review Current Data',
        duration: 15,
        description: 'Examine progress monitoring data and concerns',
      },
      {
        title: 'Proposed Changes',
        duration: 20,
        description: 'Discuss and agree on IEP modifications',
      },
    ],
  };

  const closingItems: AgendaItem[] = [
    {
      title: 'Questions and Discussion',
      duration: 10,
      description: 'Address any remaining questions or concerns',
    },
    {
      title: 'Next Steps and Closing',
      duration: 5,
      description: 'Summarize decisions and identify follow-up actions',
    },
  ];

  return [...baseItems, ...meetingSpecificItems[meetingType], ...closingItems];
}

/**
 * Parent concerns letter template
 */
export function getParentConcernsLetterTemplate(input: MeetingPrepInput): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${date}

To: IEP Team
Re: Parent Concerns for ${input.studentAlias}'s ${MEETING_TYPE_LABELS[input.meetingType]}

Dear IEP Team Members,

I am writing to document my concerns regarding my child's educational program in advance of our upcoming ${MEETING_TYPE_LABELS[input.meetingType]} scheduled for ${input.meetingDate}.

As ${input.studentAlias}'s parent, I want to ensure these concerns are formally considered as part of the IEP process, as required under IDEA (34 CFR § 300.324(a)(1)(ii)).

CONCERNS:

${input.concerns.map((c) => `${c.area}:\n${c.description}`).join('\n\n')}

DESIRED OUTCOMES:

${input.desiredOutcomes.map((o) => `• ${o}`).join('\n')}

I look forward to working collaboratively with the team to address these concerns and develop an appropriate educational program for ${input.studentAlias}.

Please include this letter in ${input.studentAlias}'s educational record.

Sincerely,

[Parent Name]
[Contact Information]`;
}

/**
 * Records request email template
 */
export function getRecordsRequestEmailTemplate(input: MeetingPrepInput): string {
  return `Subject: Request for Educational Records - ${input.studentAlias}

Dear Special Education Department,

Pursuant to the Family Educational Rights and Privacy Act (FERPA) and the Individuals with Disabilities Education Act (IDEA), I am requesting copies of the following educational records for my child, ${input.studentAlias}:

1. Current IEP and any amendments
2. Most recent evaluation reports (psychological, educational, speech/language, OT/PT, etc.)
3. Progress reports on IEP goals for the current school year
4. Standardized test results
5. Report cards and attendance records
6. Discipline records
7. Teacher observations and anecdotal notes
8. Communication logs between school and home
9. Service delivery logs (therapy sessions, special education minutes)
10. Any Functional Behavioral Assessment (FBA) or Behavior Intervention Plan (BIP)

I need these records in preparation for the upcoming ${MEETING_TYPE_LABELS[input.meetingType]} scheduled for ${input.meetingDate}.

Under FERPA, schools must comply with a records request within 45 days. However, given our upcoming meeting, I would appreciate receiving these records at least one week before the meeting date.

Please contact me if you have any questions or need any additional information to process this request.

Thank you for your prompt attention to this matter.

Sincerely,
[Parent Name]
[Phone Number]
[Email Address]`;
}

/**
 * Follow-up email template
 */
export function getFollowUpEmailTemplate(input: MeetingPrepInput): string {
  return `Subject: Follow-Up: ${input.studentAlias}'s ${MEETING_TYPE_LABELS[input.meetingType]} - [DATE]

Dear IEP Team,

Thank you for meeting with me on [DATE] to discuss ${input.studentAlias}'s educational program. I am writing to confirm my understanding of the key decisions and action items from our meeting.

DECISIONS MADE:
• [List key decisions]

ACTION ITEMS:
• [Action item 1] - Responsible: [Name] - Due: [Date]
• [Action item 2] - Responsible: [Name] - Due: [Date]

ITEMS REQUIRING FOLLOW-UP:
• [List any items that need further discussion or decision]

DOCUMENTS TO BE PROVIDED:
• [List any documents the school agreed to provide]

Please let me know if I have misunderstood any aspect of our discussion. I would also appreciate receiving a copy of the finalized IEP within the timeframe required by Maryland regulations.

If there are any discrepancies between my understanding and the official record, please contact me immediately so we can resolve them.

Thank you for your continued collaboration in supporting ${input.studentAlias}'s education.

Sincerely,
[Parent Name]
[Phone Number]
[Email Address]`;
}
