import { prisma, Prisma } from '../lib/db.js';
import OpenAI from 'openai';
import { gatherStudentContext, PresentLevelData } from './presentLevelsService.js';

const openai = new OpenAI();

export interface GoalDraftInput {
  planId: string;
  goalArea: string;
  presentLevels?: PresentLevelData;
  userPrompt?: string;
  templateId?: string;
  linkedArtifactIds?: string[];
}

export interface GeneratedObjective {
  sequence: number;
  objectiveText: string;
  measurementCriteria: string;
  suggestedTargetWeeks: number;
}

export interface GoalDraft {
  goalArea: string;
  annualGoalText: string;
  objectives: GeneratedObjective[];
  baselineDescription: string;
  measurementMethod: string;
  progressSchedule: string;
  comarReference: string | null;
  rationale: string;
}

export interface WizardChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WizardSession {
  planId: string;
  goalArea: string;
  messages: WizardChatMessage[];
  currentDraft: GoalDraft | null;
  linkedArtifactIds: string[];
}

// Maryland COMAR IEP goal requirements reference
const COMAR_GOAL_REQUIREMENTS = {
  'COMAR 13A.05.01.09': {
    title: 'Development of IEP',
    requirements: [
      'Goals must be measurable',
      'Goals must be aligned with grade-level standards',
      'Goals must address needs resulting from the disability',
      'Goals must enable the child to be involved in the general education curriculum',
    ],
  },
  'COMAR 13A.05.01.09B': {
    title: 'Annual Goals',
    requirements: [
      'A statement of measurable annual goals',
      'Goals designed to meet the child\'s needs resulting from the disability',
      'Goals to enable involvement and progress in general education curriculum',
    ],
  },
};

// Goal templates by area (Maryland COMAR-aligned)
const GOAL_TEMPLATES: Record<string, Array<{ template: string; comarRef: string; gradeBands: string[] }>> = {
  READING: [
    {
      template:
        'Given [condition], [student] will [skill] with [accuracy]% accuracy as measured by [measurement] by [date].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
    {
      template:
        '[Student] will improve reading fluency from [baseline] words per minute to [target] words per minute on grade-level text as measured by [measurement].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5'],
    },
    {
      template:
        '[Student] will demonstrate comprehension of grade-level text by [skill] with [accuracy]% accuracy on [trials] consecutive assessments.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['3-5', '6-8', '9-12'],
    },
  ],
  WRITING: [
    {
      template:
        '[Student] will compose a [type] paragraph including [elements] with [accuracy]% accuracy as measured by [rubric].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
    {
      template:
        'Given a writing prompt, [student] will independently write [quantity] sentences using [skill] with [accuracy]% accuracy.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5'],
    },
  ],
  MATH: [
    {
      template:
        '[Student] will solve [type] problems with [accuracy]% accuracy on [trials] consecutive assessments.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
    {
      template:
        'Given [materials], [student] will demonstrate understanding of [concept] by [skill] with [accuracy]% accuracy.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8'],
    },
  ],
  BEHAVIOR: [
    {
      template:
        '[Student] will demonstrate [behavior] in [setting] for [duration] with [frequency] prompts as measured by [data collection].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
    {
      template:
        'When [trigger], [student] will use [strategy] to [outcome] in [percentage]% of observed opportunities.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
  ],
  SOCIAL_EMOTIONAL: [
    {
      template:
        '[Student] will demonstrate [skill] by [behavior] in [percentage]% of opportunities as measured by [observation/data].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
    {
      template:
        'During [activity], [student] will [skill] with [frequency] verbal prompts on [trials] consecutive occasions.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5'],
    },
  ],
  COMMUNICATION: [
    {
      template:
        '[Student] will [communication skill] with [accuracy]% accuracy across [settings] as measured by [therapist observation/data].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
  ],
  MOTOR_SKILLS: [
    {
      template:
        '[Student] will [motor skill] with [level] independence as measured by [OT/PT assessment] on [trials] occasions.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['K-2', '3-5', '6-8', '9-12'],
    },
  ],
  DAILY_LIVING: [
    {
      template:
        '[Student] will independently complete [task] with [accuracy]% accuracy in [trials] consecutive opportunities.',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['6-8', '9-12'],
    },
  ],
  VOCATIONAL: [
    {
      template:
        '[Student] will demonstrate [vocational skill] with [accuracy]% accuracy as measured by [work evaluation/supervisor report].',
      comarRef: 'COMAR 13A.05.01.09B',
      gradeBands: ['9-12'],
    },
  ],
};

/**
 * Get grade band from grade string
 */
function getGradeBand(grade: string): string {
  const gradeNum = grade.toLowerCase().replace(/[^0-9k]/g, '');
  if (gradeNum === 'k' || gradeNum === '0' || gradeNum === '1' || gradeNum === '2') return 'K-2';
  if (['3', '4', '5'].includes(gradeNum)) return '3-5';
  if (['6', '7', '8'].includes(gradeNum)) return '6-8';
  return '9-12';
}

/**
 * Get templates for a goal area filtered by grade band
 */
export function getGoalTemplates(
  goalArea: string,
  gradeBand?: string
): Array<{ template: string; comarRef: string }> {
  const templates = GOAL_TEMPLATES[goalArea] || GOAL_TEMPLATES.OTHER || [];
  if (!gradeBand) return templates;

  return templates.filter((t) => t.gradeBands.includes(gradeBand));
}

/**
 * Build prompt for goal draft generation
 */
function buildGoalGenerationPrompt(params: {
  goalArea: string;
  studentContext: {
    firstName: string;
    grade: string;
  };
  presentLevels?: PresentLevelData;
  templates: Array<{ template: string; comarRef: string }>;
  userPrompt?: string;
  artifactAnalyses?: string[];
}): string {
  const { goalArea, studentContext, presentLevels, templates, userPrompt, artifactAnalyses } = params;

  let prompt = `You are a Maryland special education specialist writing COMAR-compliant IEP goals.

## Student Information
- Name: ${studentContext.firstName}
- Grade: ${studentContext.grade}
- Goal Area: ${goalArea}

## Maryland COMAR Requirements (13A.05.01.09)
Goals must be:
- Measurable with clear criteria for success
- Aligned with grade-level academic standards
- Designed to address needs resulting from the disability
- Written to enable involvement in the general education curriculum

`;

  if (presentLevels) {
    prompt += `## Present Levels Summary
Current Performance: ${presentLevels.currentPerformance}
Strengths: ${presentLevels.strengthsNoted.join(', ')}
Challenges: ${presentLevels.challengesNoted.join(', ')}
Recent Progress: ${presentLevels.recentProgress}

`;
  }

  if (artifactAnalyses && artifactAnalyses.length > 0) {
    prompt += `## Artifact Comparison Insights
${artifactAnalyses.join('\n\n')}

`;
  }

  if (templates.length > 0) {
    prompt += `## Goal Templates (COMAR-aligned)
Use these templates as guides for structure:
${templates.map((t, i) => `${i + 1}. ${t.template} (Ref: ${t.comarRef})`).join('\n')}

`;
  }

  if (userPrompt) {
    prompt += `## Teacher's Request
${userPrompt}

`;
  }

  prompt += `## Instructions
Generate a complete, COMAR-compliant annual goal with short-term objectives.

Respond in JSON format:
{
  "annualGoalText": "The complete annual goal statement",
  "objectives": [
    {
      "sequence": 1,
      "objectiveText": "First short-term objective",
      "measurementCriteria": "How this objective will be measured",
      "suggestedTargetWeeks": 12
    },
    // 2-3 additional objectives
  ],
  "baselineDescription": "Current baseline data/performance level",
  "measurementMethod": "How progress will be measured",
  "progressSchedule": "quarterly", // or "weekly", "monthly"
  "comarReference": "COMAR 13A.05.01.09B",
  "rationale": "Brief explanation of why this goal addresses the student's needs"
}

Ensure the goal is:
1. Specific and measurable with clear criteria
2. Achievable within one school year
3. Relevant to the student's present levels
4. Time-bound with appropriate objectives`;

  return prompt;
}

/**
 * Generate a goal draft using GPT
 */
export async function generateGoalDraft(input: GoalDraftInput): Promise<GoalDraft> {
  const { planId, goalArea, presentLevels, userPrompt, linkedArtifactIds } = input;

  // Get plan and student info
  const plan = await prisma.planInstance.findUnique({
    where: { id: planId },
    include: {
      student: {
        select: { id: true, firstName: true, grade: true },
      },
    },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const gradeBand = getGradeBand(plan.student.grade);
  const templates = getGoalTemplates(goalArea, gradeBand);

  // Get artifact analyses if linked
  let artifactAnalyses: string[] = [];
  if (linkedArtifactIds && linkedArtifactIds.length > 0) {
    const artifacts = await prisma.artifactComparison.findMany({
      where: {
        id: { in: linkedArtifactIds },
        studentId: plan.student.id,
      },
      select: {
        artifactDate: true,
        description: true,
        analysisText: true,
      },
    });
    artifactAnalyses = artifacts
      .filter((a) => a.analysisText)
      .map((a) => `[${a.artifactDate.toLocaleDateString()}] ${a.description || ''}: ${a.analysisText}`);
  }

  const prompt = buildGoalGenerationPrompt({
    goalArea,
    studentContext: {
      firstName: plan.student.firstName,
      grade: plan.student.grade,
    },
    presentLevels,
    templates,
    userPrompt,
    artifactAnalyses,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a Maryland special education expert. Generate COMAR-compliant IEP goals. Always respond with valid JSON.',
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
      goalArea,
      annualGoalText: parsed.annualGoalText || '',
      objectives: Array.isArray(parsed.objectives)
        ? parsed.objectives.map((o: Prisma.JsonValue, i: number) => {
            const obj = o as Record<string, unknown>;
            return {
              sequence: obj.sequence || i + 1,
              objectiveText: String(obj.objectiveText || ''),
              measurementCriteria: String(obj.measurementCriteria || ''),
              suggestedTargetWeeks: Number(obj.suggestedTargetWeeks) || 12,
            };
          })
        : [],
      baselineDescription: parsed.baselineDescription || '',
      measurementMethod: parsed.measurementMethod || '',
      progressSchedule: parsed.progressSchedule || 'quarterly',
      comarReference: parsed.comarReference || 'COMAR 13A.05.01.09B',
      rationale: parsed.rationale || '',
    };
  } catch (error) {
    console.error('GPT goal generation error:', error);
    throw new Error('Failed to generate goal draft');
  }
}

/**
 * Continue a wizard chat conversation
 */
export async function continueWizardChat(
  session: WizardSession,
  userMessage: string
): Promise<{ response: string; updatedDraft: GoalDraft | null }> {
  // Add user message to history
  session.messages.push({ role: 'user', content: userMessage });

  // Build system context
  const systemMessage = `You are a helpful special education specialist assistant.
You are helping a teacher write IEP goals for a student.
Current goal area: ${session.goalArea}

${
  session.currentDraft
    ? `Current draft goal:
${session.currentDraft.annualGoalText}

Current objectives:
${session.currentDraft.objectives.map((o) => `${o.sequence}. ${o.objectiveText}`).join('\n')}`
    : 'No draft goal yet.'
}

Help the teacher refine the goal. When the user asks to create or finalize a goal, or says "yes", "ok", "create it", "generate", etc., you MUST respond with a JSON block containing the complete goal.

IMPORTANT: When providing a goal, you MUST include it in this exact JSON format at the end of your response:
\`\`\`json
{
  "annualGoalText": "By the end of the IEP period, [student] will [specific measurable goal]...",
  "objectives": [
    {"sequence": 1, "objectiveText": "First objective...", "measurementCriteria": "How measured..."},
    {"sequence": 2, "objectiveText": "Second objective...", "measurementCriteria": "How measured..."},
    {"sequence": 3, "objectiveText": "Third objective...", "measurementCriteria": "How measured..."}
  ],
  "baselineDescription": "Current performance level...",
  "measurementMethod": "How progress will be tracked...",
  "progressSchedule": "quarterly",
  "rationale": "Why this goal addresses the student's needs..."
}
\`\`\`

Always include the JSON block when providing or updating a goal. The teacher needs the structured data.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        ...session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Add assistant response to history
    session.messages.push({ role: 'assistant', content: responseText });

    // Check if response contains updated draft
    let updatedDraft: GoalDraft | null = null;
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.annualGoalText) {
          updatedDraft = {
            goalArea: session.goalArea,
            annualGoalText: parsed.annualGoalText,
            objectives: Array.isArray(parsed.objectives)
              ? parsed.objectives.map((o: { sequence?: number; objectiveText?: string; measurementCriteria?: string }, i: number) => ({
                  sequence: o.sequence || i + 1,
                  objectiveText: o.objectiveText || '',
                  measurementCriteria: o.measurementCriteria || '',
                  suggestedTargetWeeks: 12,
                }))
              : session.currentDraft?.objectives || [],
            baselineDescription: parsed.baselineDescription || session.currentDraft?.baselineDescription || '',
            measurementMethod: parsed.measurementMethod || session.currentDraft?.measurementMethod || '',
            progressSchedule: parsed.progressSchedule || session.currentDraft?.progressSchedule || 'quarterly',
            comarReference: parsed.comarReference || session.currentDraft?.comarReference || null,
            rationale: parsed.rationale || session.currentDraft?.rationale || '',
          };
        }
      } catch {
        // JSON parsing failed, try fallback extraction
        console.log('JSON parsing failed, trying fallback extraction');
      }
    }

    // Fallback: Try to extract goal from text patterns if no JSON found
    if (!updatedDraft && responseText.toLowerCase().includes('goal')) {
      // Look for common goal patterns like "By the end of..." or "**Sample Reading Goal:**"
      const goalPatterns = [
        /\*\*(?:Sample |Annual |Reading |Math |Writing )?Goal[:\*]*\s*["']?([^"'\n]+(?:\n(?![*\-#])[^"'\n]+)*)/i,
        /By the end of (?:the IEP period|the school year|[^,]+),\s*(?:the student will|[^.]+will)\s+[^.]+\./i,
        /"annualGoalText":\s*"([^"]+)"/i,
      ];

      for (const pattern of goalPatterns) {
        const match = responseText.match(pattern);
        if (match) {
          const goalText = match[1] || match[0];
          if (goalText && goalText.length > 20) {
            // Extract objectives if present
            const objectiveMatches = responseText.match(/\d+\.\s+(?:The student will\s+)?([^.]+\.)/gi) || [];
            const objectives = objectiveMatches.slice(0, 3).map((obj, i) => ({
              sequence: i + 1,
              objectiveText: obj.replace(/^\d+\.\s*/, '').trim(),
              measurementCriteria: '',
              suggestedTargetWeeks: 12,
            }));

            updatedDraft = {
              goalArea: session.goalArea,
              annualGoalText: goalText.trim().replace(/^["']|["']$/g, ''),
              objectives: objectives.length > 0 ? objectives : session.currentDraft?.objectives || [],
              baselineDescription: session.currentDraft?.baselineDescription || '',
              measurementMethod: session.currentDraft?.measurementMethod || '',
              progressSchedule: 'quarterly',
              comarReference: null,
              rationale: session.currentDraft?.rationale || '',
            };
            break;
          }
        }
      }
    }

    return {
      response: responseText.replace(/```json\n?[\s\S]*?\n?```/g, '').trim(),
      updatedDraft,
    };
  } catch (error) {
    console.error('Wizard chat error:', error);
    throw new Error('Failed to process wizard chat');
  }
}

/**
 * Save a goal draft to the database
 */
export async function saveGoalDraft(params: {
  planId: string;
  draft: GoalDraft;
  linkedArtifactIds?: string[];
  userId: string;
}): Promise<string> {
  const { planId, draft, linkedArtifactIds, userId } = params;

  // Verify plan exists and get next goal code
  const plan = await prisma.planInstance.findUnique({
    where: { id: planId },
    include: {
      goals: {
        select: { goalCode: true },
        orderBy: { goalCode: 'desc' },
        take: 1,
      },
    },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Generate next goal code
  const lastGoalCode = plan.goals[0]?.goalCode || 'GOAL-0';
  const nextNumber = parseInt(lastGoalCode.split('-')[1] || '0', 10) + 1;
  const goalCode = `GOAL-${nextNumber}`;

  // Create goal with objectives
  const goal = await prisma.goal.create({
    data: {
      planInstance: { connect: { id: planId } },
      targetDate: null,
      goalCode,
      area: draft.goalArea as Prisma.EnumGoalAreaFieldUpdateOperationsInput['set'],
      annualGoalText: draft.annualGoalText,
      baselineJson: {
        description: draft.baselineDescription,
        measurementMethod: draft.measurementMethod,
      },
      shortTermObjectives: draft.objectives.map((o) => o.objectiveText),
      progressSchedule: draft.progressSchedule,
      presentLevelJson: {
        rationale: draft.rationale,
      },
      draftStatus: 'WIZARD_DRAFT',
      comarAlignmentJson: {
        reference: draft.comarReference,
        validated: false,
      },
      objectives: {
        create: draft.objectives.map((obj) => ({
          sequence: obj.sequence,
          objectiveText: obj.objectiveText,
          measurementCriteria: obj.measurementCriteria,
          targetDate: new Date(Date.now() + obj.suggestedTargetWeeks * 7 * 24 * 60 * 60 * 1000),
        })),
      },
    },
  });

  // Link artifacts if provided
  if (linkedArtifactIds && linkedArtifactIds.length > 0) {
    await prisma.goalArtifactLink.createMany({
      data: linkedArtifactIds.map((artifactId) => ({
        goalId: goal.id,
        artifactComparisonId: artifactId,
        relevanceNote: 'Linked during goal wizard',
      })),
    });
  }

  return goal.id;
}

/**
 * Finalize a draft goal (mark as ready for IEP)
 */
export async function finalizeGoal(goalId: string): Promise<void> {
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      draftStatus: 'FINALIZED',
      comarAlignmentJson: {
        validated: true,
        validatedAt: new Date().toISOString(),
      },
    },
  });
}
