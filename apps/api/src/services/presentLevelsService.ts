import { prisma, Prisma } from '../lib/db.js';
import OpenAI from 'openai';

// Initialize OpenAI client - will use OPENAI_API_KEY from env
// Lazy-initialize OpenAI client to prevent app crash if API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set. AI features are unavailable.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface PresentLevelData {
  area: string;
  currentPerformance: string;
  strengthsNoted: string[];
  challengesNoted: string[];
  recentProgress: string;
  dataSourceSummary: string;
  // Enhanced fields with standards references
  gradeStandardsComparison?: string;
  standardsReferenced?: Array<{
    standard: string;
    code: string;
    studentPerformance: string;
    gapAnalysis: string;
  }>;
  impactOnGeneralEducation?: string;
  accommodationsNeeded?: string[];
  assessmentResults?: Array<{
    assessmentName: string;
    date: string;
    score: string;
    interpretation: string;
  }>;
  parentConcerns?: string;
  functionalImplications?: string;
  baselineData?: Array<{
    metric: string;
    currentLevel: string;
    expectedLevel: string;
    measurementMethod: string;
  }>;
}

export interface PresentLevelsContext {
  studentId: string;
  planId?: string;
  goalArea?: string;
}

export interface StudentContextData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    dateOfBirth: Date;
  };
  recentStatuses: Array<{
    scope: string;
    code: string;
    summary: string | null;
    effectiveDate: Date;
  }>;
  artifactComparisons: Array<{
    id: string;
    artifactDate: Date;
    description: string | null;
    analysisText: string | null;
    planTypeCode: string | null;
  }>;
  existingGoals: Array<{
    id: string;
    area: string;
    annualGoalText: string;
    progressRecords: Array<{
      date: Date;
      quickSelect: string;
      comment: string | null;
    }>;
  }>;
}

// Maryland COMAR goal areas mapping
const GOAL_AREA_LABELS: Record<string, string> = {
  READING: 'Reading',
  WRITING: 'Writing',
  MATH: 'Mathematics',
  COMMUNICATION: 'Communication',
  SOCIAL_EMOTIONAL: 'Social-Emotional',
  BEHAVIOR: 'Behavior',
  MOTOR_SKILLS: 'Motor Skills',
  DAILY_LIVING: 'Daily Living Skills',
  VOCATIONAL: 'Vocational/Transition',
  OTHER: 'Other',
};

/**
 * Gather all relevant student context for present levels generation
 */
export async function gatherStudentContext(params: PresentLevelsContext): Promise<StudentContextData> {
  const { studentId, planId, goalArea } = params;

  // Fetch student data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      dateOfBirth: true,
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Fetch recent status updates (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentStatuses = await prisma.studentStatus.findMany({
    where: {
      studentId,
      effectiveDate: { gte: sixMonthsAgo },
    },
    orderBy: { effectiveDate: 'desc' },
    take: 20,
    select: {
      scope: true,
      code: true,
      summary: true,
      effectiveDate: true,
    },
  });

  // Fetch artifact comparisons with analysis
  const artifactComparisons = await prisma.artifactComparison.findMany({
    where: {
      studentId,
      analysisText: { not: null },
    },
    orderBy: { artifactDate: 'desc' },
    take: 10,
    select: {
      id: true,
      artifactDate: true,
      description: true,
      analysisText: true,
      planType: {
        select: { code: true },
      },
    },
  });

  // Fetch existing goals and recent progress
  const existingGoals = await prisma.goal.findMany({
    where: {
      planInstance: {
        studentId,
        status: { in: ['ACTIVE', 'DRAFT'] },
      },
      isActive: true,
      ...(goalArea && { area: goalArea as Prisma.EnumGoalAreaFilter }),
    },
    include: {
      progressRecords: {
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          date: true,
          quickSelect: true,
          comment: true,
        },
      },
    },
    take: 10,
  });

  return {
    student,
    recentStatuses,
    artifactComparisons: artifactComparisons.map((ac) => ({
      id: ac.id,
      artifactDate: ac.artifactDate,
      description: ac.description,
      analysisText: ac.analysisText,
      planTypeCode: ac.planType?.code || null,
    })),
    existingGoals: existingGoals.map((g) => ({
      id: g.id,
      area: g.area,
      annualGoalText: g.annualGoalText,
      progressRecords: g.progressRecords,
    })),
  };
}

// Maryland College and Career Ready Standards (MCCRS) grade-level expectations
const GRADE_STANDARDS: Record<string, Record<string, string[]>> = {
  READING: {
    'K': ['RF.K.1: Demonstrate understanding of print concepts', 'RF.K.2: Demonstrate phonological awareness', 'RF.K.3: Know letter-sound correspondences'],
    '1': ['RF.1.1: Know letter-sound correspondences', 'RF.1.2: Decode one-syllable words', 'RL.1.1: Ask and answer questions about key details'],
    '2': ['RF.2.3: Know spelling-sound correspondences', 'RF.2.4: Read with accuracy and fluency (90 WCPM)', 'RL.2.1: Ask and answer who, what, where, when, why, how'],
    '3': ['RF.3.3: Decode multisyllable words', 'RF.3.4: Read with fluency (110 WCPM)', 'RL.3.1: Demonstrate literal and inferential comprehension'],
    '4': ['RF.4.3: Use letter-sound knowledge to decode', 'RF.4.4: Read with fluency (130 WCPM)', 'RL.4.1: Refer to details and examples in text'],
    '5': ['RF.5.3: Use morphology to decode', 'RF.5.4: Read with fluency (140 WCPM)', 'RL.5.1: Quote accurately from text'],
    '6': ['RL.6.1: Cite textual evidence', 'RL.6.2: Determine theme', 'RI.6.4: Determine meaning of words and phrases'],
    '7': ['RL.7.1: Cite several pieces of evidence', 'RL.7.2: Analyze theme development', 'RI.7.5: Analyze structure'],
    '8': ['RL.8.1: Cite strongest textual evidence', 'RL.8.2: Determine theme and analyze development', 'RI.8.6: Determine author POV'],
    '9-12': ['RL.9-10.1: Cite strong evidence', 'RL.9-10.2: Determine theme and analyze development', 'RI.9-10.5: Analyze structure'],
  },
  MATH: {
    'K': ['K.CC.1: Count to 100', 'K.CC.4: Understand counting', 'K.OA.1: Represent addition/subtraction'],
    '1': ['1.OA.1: Add/subtract within 20', '1.NBT.1: Count to 120', '1.NBT.4: Add within 100'],
    '2': ['2.OA.2: Fluently add/subtract within 20', '2.NBT.1: Understand place value to 1000', '2.NBT.5: Fluently add/subtract within 100'],
    '3': ['3.OA.7: Fluently multiply/divide within 100', '3.NBT.2: Fluently add/subtract within 1000', '3.NF.1: Understand fractions'],
    '4': ['4.NBT.4: Fluently add/subtract multi-digit', '4.NF.1: Equivalent fractions', '4.OA.1: Multiplicative comparisons'],
    '5': ['5.NBT.5: Fluently multiply multi-digit', '5.NF.1: Add/subtract fractions', '5.NBT.7: Operations with decimals'],
    '6': ['6.RP.1: Understand ratio concepts', '6.NS.1: Divide fractions', '6.EE.1: Evaluate expressions'],
    '7': ['7.RP.1: Compute unit rates', '7.NS.1: Add/subtract rational numbers', '7.EE.1: Apply properties'],
    '8': ['8.EE.1: Integer exponents', '8.F.1: Understand functions', '8.G.1: Geometric transformations'],
    '9-12': ['A-SSE.1: Interpret expressions', 'A-REI.1: Explain reasoning', 'F-IF.1: Understand function notation'],
  },
  WRITING: {
    'K': ['W.K.1: Use drawing/writing for opinions', 'W.K.2: Compose informative texts', 'W.K.3: Narrate single event'],
    '1': ['W.1.1: Write opinion pieces', 'W.1.2: Write informative texts', 'W.1.3: Write narratives'],
    '2': ['W.2.1: Write opinions with reasons', 'W.2.2: Write informative with facts', 'W.2.3: Write narratives with sequence'],
    '3': ['W.3.1: Write opinions supporting POV', 'W.3.2: Write informative with categories', 'W.3.3: Write narratives with dialogue'],
    '4': ['W.4.1: Write opinions with organized reasons', 'W.4.2: Write informative with formatting', 'W.4.3: Write narratives with description'],
    '5': ['W.5.1: Write opinions with logically organized support', 'W.5.2: Write informative with varied sentence structure', 'W.5.3: Write narratives with pacing'],
    '6': ['W.6.1: Write arguments with claims and evidence', 'W.6.2: Write informative with relevant content', 'W.6.3: Write narratives with technique'],
    '7': ['W.7.1: Write arguments acknowledging opposing claims', 'W.7.2: Write informative with coherence', 'W.7.3: Write narratives with point of view'],
    '8': ['W.8.1: Write arguments with credible sources', 'W.8.2: Write informative with transitions', 'W.8.3: Write narratives with reflection'],
    '9-12': ['W.9-10.1: Write arguments analyzing substantive topics', 'W.9-10.2: Write informative with complex ideas', 'W.9-10.3: Write narratives with multiple plot lines'],
  },
  COMMUNICATION: {
    'K-2': ['SL.K-2.1: Participate in collaborative conversations', 'SL.K-2.4: Describe people, places, things', 'SL.K-2.6: Speak audibly'],
    '3-5': ['SL.3-5.1: Engage in collaborative discussions', 'SL.3-5.4: Report on topic with facts', 'SL.3-5.6: Adapt speech to context'],
    '6-8': ['SL.6-8.1: Engage in range of discussions', 'SL.6-8.4: Present claims with evidence', 'SL.6-8.6: Adapt speech to variety of contexts'],
    '9-12': ['SL.9-12.1: Initiate and participate in discussions', 'SL.9-12.4: Present information with evidence', 'SL.9-12.6: Adapt speech to task'],
  },
};

// Fluency benchmarks by grade (WCPM = Words Correct Per Minute)
const FLUENCY_BENCHMARKS: Record<string, { fall: number; winter: number; spring: number }> = {
  '1': { fall: 0, winter: 23, spring: 53 },
  '2': { fall: 50, winter: 72, spring: 89 },
  '3': { fall: 71, winter: 92, spring: 110 },
  '4': { fall: 94, winter: 112, spring: 124 },
  '5': { fall: 110, winter: 127, spring: 139 },
  '6': { fall: 127, winter: 140, spring: 150 },
  '7': { fall: 128, winter: 136, spring: 150 },
  '8': { fall: 133, winter: 146, spring: 151 },
};

/**
 * Get grade-appropriate standards for the goal area
 */
function getRelevantStandards(grade: string, goalArea: string): string[] {
  const normalizedGrade = grade.replace(/[^0-9kK]/g, '').toUpperCase();
  const gradeKey = normalizedGrade === 'K' ? 'K' : normalizedGrade;

  const areaStandards = GRADE_STANDARDS[goalArea];
  if (!areaStandards) return [];

  // Try exact grade match first
  if (areaStandards[gradeKey]) {
    return areaStandards[gradeKey];
  }

  // Try grade bands for communication
  if (goalArea === 'COMMUNICATION') {
    const gradeNum = parseInt(gradeKey) || 0;
    if (gradeNum <= 2) return areaStandards['K-2'] || [];
    if (gradeNum <= 5) return areaStandards['3-5'] || [];
    if (gradeNum <= 8) return areaStandards['6-8'] || [];
    return areaStandards['9-12'] || [];
  }

  // Try high school band
  const gradeNum = parseInt(gradeKey) || 0;
  if (gradeNum >= 9) {
    return areaStandards['9-12'] || [];
  }

  return [];
}

/**
 * Build the prompt for present levels generation
 */
function buildPresentLevelsPrompt(context: StudentContextData, goalArea?: string): string {
  const { student, recentStatuses, artifactComparisons, existingGoals } = context;
  const areaLabel = goalArea ? GOAL_AREA_LABELS[goalArea] || goalArea : 'all areas';
  const gradeStandards = goalArea ? getRelevantStandards(student.grade, goalArea) : [];
  const fluencyBenchmark = FLUENCY_BENCHMARKS[student.grade.replace(/[^0-9]/g, '')] || null;

  let prompt = `You are an expert special education specialist helping write Present Levels of Academic Achievement and Functional Performance (PLAAFP) for a Maryland IEP.

## Student Information
- Name: ${student.firstName} ${student.lastName}
- Grade: ${student.grade}
- Date of Birth: ${student.dateOfBirth.toLocaleDateString()}
- Focus Area: ${areaLabel}

## Maryland COMAR 13A.05.01 Compliance Requirements
Present levels must include (per COMAR 13A.05.01.09):
1. Current academic achievement and functional performance with measurable data
2. How the disability affects involvement and progress in the general education curriculum
3. Strengths of the student
4. Concerns of the parent/guardian
5. Results of most recent evaluations with specific scores/metrics
6. Needs that result from the disability
7. Baseline data for goal development

## Grade-Level Standards Reference (Maryland College and Career Ready Standards)
`;

  if (gradeStandards.length > 0) {
    prompt += `For Grade ${student.grade} in ${areaLabel}, students are expected to demonstrate:\n`;
    gradeStandards.forEach((standard) => {
      prompt += `- ${standard}\n`;
    });
  } else {
    prompt += `Standard grade-level expectations for ${areaLabel}\n`;
  }

  if (fluencyBenchmark && (goalArea === 'READING' || !goalArea)) {
    prompt += `\n## Reading Fluency Benchmarks (Grade ${student.grade})
- Fall: ${fluencyBenchmark.fall} WCPM
- Winter: ${fluencyBenchmark.winter} WCPM
- Spring: ${fluencyBenchmark.spring} WCPM
`;
  }

  prompt += '\n## Recent Status Updates\n';
  if (recentStatuses.length > 0) {
    recentStatuses.forEach((status) => {
      prompt += `- [${status.effectiveDate.toLocaleDateString()}] ${status.scope}: ${status.code}`;
      if (status.summary) {
        prompt += ` - ${status.summary}`;
      }
      prompt += '\n';
    });
  } else {
    prompt += '- No recent status updates available\n';
  }

  prompt += '\n## Artifact Comparison Analyses (Work Sample Data)\n';
  if (artifactComparisons.length > 0) {
    artifactComparisons.forEach((ac) => {
      prompt += `### ${ac.artifactDate.toLocaleDateString()}`;
      if (ac.description) {
        prompt += ` - ${ac.description}`;
      }
      prompt += '\n';
      if (ac.analysisText) {
        prompt += `${ac.analysisText}\n\n`;
      }
    });
  } else {
    prompt += 'No artifact analyses available\n';
  }

  prompt += '\n## Existing Goals and Progress Monitoring Data\n';
  if (existingGoals.length > 0) {
    existingGoals.forEach((goal) => {
      prompt += `### ${GOAL_AREA_LABELS[goal.area] || goal.area}\n`;
      prompt += `Goal: ${goal.annualGoalText}\n`;
      if (goal.progressRecords.length > 0) {
        prompt += 'Progress Monitoring Data:\n';
        goal.progressRecords.forEach((pr) => {
          prompt += `  - [${pr.date.toLocaleDateString()}] ${pr.quickSelect}`;
          if (pr.comment) {
            prompt += `: ${pr.comment}`;
          }
          prompt += '\n';
        });
      }
      prompt += '\n';
    });
  } else {
    prompt += 'No existing goals in this area\n';
  }

  prompt += `
## Instructions
Based on the information above, generate a COMPREHENSIVE Present Levels statement for ${areaLabel} that meets Maryland COMAR requirements.

BE SPECIFIC AND DATA-DRIVEN. Include:
- Exact metrics, percentages, and scores where available
- Specific standard codes (e.g., RF.3.4, 3.OA.7) when referencing skills
- Comparison to grade-level expectations
- Measurable baseline data for goal development

Respond in JSON format with the following structure:
{
  "currentPerformance": "Detailed description of current performance with SPECIFIC DATA (scores, percentages, levels). Example: 'Student reads at 85 WCPM compared to grade-level expectation of 110 WCPM (77% of benchmark).'",

  "strengthsNoted": ["Specific strength with evidence", "Another strength with data", ...],

  "challengesNoted": ["Specific challenge with measurable gap", "Another challenge with data", ...],

  "recentProgress": "Summary of progress with trend data (e.g., 'Improved from 70 WCPM to 85 WCPM over 3 months')",

  "dataSourceSummary": "List of data sources used (observations, assessments, work samples, progress monitoring)",

  "gradeStandardsComparison": "Detailed comparison to Maryland College and Career Ready Standards with specific standard codes",

  "standardsReferenced": [
    {
      "standard": "Full standard description",
      "code": "Standard code (e.g., RF.3.4)",
      "studentPerformance": "How student performs on this standard with data",
      "gapAnalysis": "Specific gap between current and expected performance"
    }
  ],

  "impactOnGeneralEducation": "How disability affects access to general curriculum with specific examples",

  "accommodationsNeeded": ["Specific accommodation 1", "Specific accommodation 2", ...],

  "assessmentResults": [
    {
      "assessmentName": "Name of assessment",
      "date": "Date administered",
      "score": "Score/result with percentile or grade equivalent",
      "interpretation": "What this score means for instruction"
    }
  ],

  "parentConcerns": "Note any parent concerns from the data or state 'Parent input to be gathered at IEP meeting'",

  "functionalImplications": "How challenges affect daily functioning and learning",

  "baselineData": [
    {
      "metric": "What is being measured",
      "currentLevel": "Current performance level with number",
      "expectedLevel": "Grade-level expectation with number",
      "measurementMethod": "How this will be measured for progress monitoring"
    }
  ],

  "suggestedGoalAreas": ["Area 1", "Area 2", ...] // Areas that may need new goals based on gaps
}

IMPORTANT:
- Be specific with numbers, percentages, and standard codes
- Reference actual Maryland/Common Core standards where applicable
- Provide measurable baseline data that can be used for IEP goal development
- Maintain strengths-based language while clearly identifying needs`;

  return prompt;
}

/**
 * Generate present levels statement using GPT
 */
export async function generatePresentLevels(
  params: PresentLevelsContext
): Promise<PresentLevelData & { suggestedGoalAreas: string[] }> {
  const context = await gatherStudentContext(params);
  const prompt = buildPresentLevelsPrompt(context, params.goalArea);

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a special education expert specializing in Maryland IEPs and COMAR compliance. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from GPT');
    }

    const parsed = JSON.parse(responseText);

    return {
      area: params.goalArea || 'OVERALL',
      currentPerformance: parsed.currentPerformance || '',
      strengthsNoted: Array.isArray(parsed.strengthsNoted) ? parsed.strengthsNoted : [],
      challengesNoted: Array.isArray(parsed.challengesNoted) ? parsed.challengesNoted : [],
      recentProgress: parsed.recentProgress || '',
      dataSourceSummary: parsed.dataSourceSummary || '',
      suggestedGoalAreas: Array.isArray(parsed.suggestedGoalAreas) ? parsed.suggestedGoalAreas : [],
      // Enhanced fields with standards references
      gradeStandardsComparison: parsed.gradeStandardsComparison || undefined,
      standardsReferenced: Array.isArray(parsed.standardsReferenced) ? parsed.standardsReferenced : undefined,
      impactOnGeneralEducation: parsed.impactOnGeneralEducation || undefined,
      accommodationsNeeded: Array.isArray(parsed.accommodationsNeeded) ? parsed.accommodationsNeeded : undefined,
      assessmentResults: Array.isArray(parsed.assessmentResults) ? parsed.assessmentResults : undefined,
      parentConcerns: parsed.parentConcerns || undefined,
      functionalImplications: parsed.functionalImplications || undefined,
      baselineData: Array.isArray(parsed.baselineData) ? parsed.baselineData : undefined,
    };
  } catch (error) {
    console.error('GPT present levels generation error:', error);
    throw new Error('Failed to generate present levels');
  }
}

/**
 * Generate present levels helper suggestions without full GPT call
 * Uses status history and artifact data to provide quick suggestions
 */
export async function getPresentLevelsHelpers(
  studentId: string,
  goalArea?: string
): Promise<{
  statusSummary: Record<string, { latestCode: string; latestSummary: string | null }>;
  artifactHighlights: Array<{ date: string; summary: string }>;
  progressTrend: string;
}> {
  const context = await gatherStudentContext({ studentId, goalArea });

  // Summarize status by scope
  const statusSummary: Record<string, { latestCode: string; latestSummary: string | null }> = {};
  for (const status of context.recentStatuses) {
    if (!statusSummary[status.scope]) {
      statusSummary[status.scope] = {
        latestCode: status.code,
        latestSummary: status.summary,
      };
    }
  }

  // Extract key highlights from artifact analyses
  const artifactHighlights = context.artifactComparisons.slice(0, 3).map((ac) => ({
    date: ac.artifactDate.toLocaleDateString(),
    summary: ac.analysisText?.substring(0, 200) + '...' || 'No analysis available',
  }));

  // Determine progress trend from goal progress records
  let progressTrend = 'No recent progress data available';
  if (context.existingGoals.length > 0) {
    const allProgress = context.existingGoals.flatMap((g) => g.progressRecords);
    if (allProgress.length > 0) {
      const progressLevels = allProgress.map((p) => p.quickSelect);
      const metTargetCount = progressLevels.filter((p) => p === 'MET_TARGET').length;
      const concernCount = progressLevels.filter((p) => p === 'FULL_SUPPORT' || p === 'NOT_ADDRESSED').length;

      if (metTargetCount > progressLevels.length / 2) {
        progressTrend = 'Strong progress - meeting targets on majority of goals';
      } else if (concernCount > progressLevels.length / 2) {
        progressTrend = 'Additional support needed - struggling with current goals';
      } else {
        progressTrend = 'Mixed progress - some areas improving, others need attention';
      }
    }
  }

  return {
    statusSummary,
    artifactHighlights,
    progressTrend,
  };
}
