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

/**
 * Build the prompt for present levels generation
 */
function buildPresentLevelsPrompt(context: StudentContextData, goalArea?: string): string {
  const { student, recentStatuses, artifactComparisons, existingGoals } = context;
  const areaLabel = goalArea ? GOAL_AREA_LABELS[goalArea] || goalArea : 'all areas';

  let prompt = `You are an expert special education specialist helping write Present Levels of Academic Achievement and Functional Performance (PLAAFP) for a Maryland IEP.

## Student Information
- Name: ${student.firstName} ${student.lastName}
- Grade: ${student.grade}
- Focus Area: ${areaLabel}

## Maryland COMAR Compliance Requirements
Present levels must include:
1. Current academic achievement and functional performance
2. How the disability affects involvement in the general education curriculum
3. Strengths of the student
4. Concerns of the parent/guardian
5. Results of most recent evaluations
6. Needs that result from the disability

## Recent Status Updates
`;

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

  prompt += '\n## Artifact Comparison Analyses\n';
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

  prompt += '\n## Existing Goals and Progress\n';
  if (existingGoals.length > 0) {
    existingGoals.forEach((goal) => {
      prompt += `### ${GOAL_AREA_LABELS[goal.area] || goal.area}\n`;
      prompt += `Goal: ${goal.annualGoalText}\n`;
      if (goal.progressRecords.length > 0) {
        prompt += 'Recent Progress:\n';
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
Based on the information above, generate a comprehensive Present Levels statement for ${areaLabel}.

Respond in JSON format with the following structure:
{
  "currentPerformance": "A detailed description of current academic/functional performance",
  "strengthsNoted": ["Strength 1", "Strength 2", ...],
  "challengesNoted": ["Challenge 1", "Challenge 2", ...],
  "recentProgress": "Summary of recent progress observed",
  "dataSourceSummary": "Brief description of data sources used",
  "suggestedGoalAreas": ["Area 1", "Area 2", ...] // Areas that may need new goals
}

Be specific, data-driven, and maintain a strengths-based perspective while clearly identifying needs.`;

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
