import OpenAI from 'openai';

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

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  code: string;
  message: string;
  comarReference?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  comarCompliance: {
    measurable: boolean;
    gradeAligned: boolean;
    needsBased: boolean;
    geAccessEnabled: boolean;
  };
  suggestions: string[];
}

export interface GoalForValidation {
  annualGoalText: string;
  area: string;
  objectives?: Array<{
    objectiveText: string;
    measurementCriteria?: string;
  }>;
  baselineDescription?: string;
  studentGrade?: string;
}

// Maryland COMAR 13A.05.01.09 - IEP Goal Requirements
const COMAR_REQUIREMENTS = {
  // Measurability requirements
  MEASURABLE_COMPONENTS: [
    'accuracy',
    'percentage',
    'frequency',
    'rate',
    'trials',
    'consecutive',
    'independently',
    'with support',
    'prompts',
    'occasions',
  ],
  TIMEFRAME_WORDS: [
    'by',
    'within',
    'per',
    'weekly',
    'monthly',
    'quarterly',
    'annually',
    'school year',
  ],
  // Action verbs that indicate measurable behaviors
  MEASURABLE_VERBS: [
    'demonstrate',
    'complete',
    'identify',
    'solve',
    'read',
    'write',
    'calculate',
    'produce',
    'respond',
    'initiate',
    'use',
    'apply',
    'perform',
    'execute',
    'state',
    'recite',
    'list',
    'explain',
  ],
  // Vague verbs to avoid
  VAGUE_VERBS: [
    'understand',
    'know',
    'learn',
    'appreciate',
    'become aware',
    'be exposed',
    'improve',
    'become better',
    'try',
    'attempt',
  ],
};

/**
 * Check if goal text contains measurable components
 */
function checkMeasurability(goalText: string): { passed: boolean; missing: string[] } {
  const lowerText = goalText.toLowerCase();
  const missing: string[] = [];

  // Check for measurable components (accuracy, percentage, etc.)
  const hasMeasurableComponent = COMAR_REQUIREMENTS.MEASURABLE_COMPONENTS.some((comp) =>
    lowerText.includes(comp)
  );
  if (!hasMeasurableComponent) {
    missing.push('measurable criteria (e.g., accuracy percentage, frequency, trials)');
  }

  // Check for timeframe
  const hasTimeframe = COMAR_REQUIREMENTS.TIMEFRAME_WORDS.some((word) => lowerText.includes(word));
  if (!hasTimeframe) {
    missing.push('timeframe or measurement schedule');
  }

  // Check for measurable verb
  const hasMeasurableVerb = COMAR_REQUIREMENTS.MEASURABLE_VERBS.some((verb) =>
    lowerText.includes(verb)
  );
  if (!hasMeasurableVerb) {
    missing.push('observable action verb');
  }

  // Check for vague verbs
  const hasVagueVerb = COMAR_REQUIREMENTS.VAGUE_VERBS.some((verb) => lowerText.includes(verb));
  if (hasVagueVerb) {
    missing.push('Remove vague verbs (understand, know, learn, etc.)');
  }

  return {
    passed: missing.length === 0,
    missing,
  };
}

/**
 * Check if goal has condition-behavior-criteria structure
 */
function checkGoalStructure(goalText: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for condition (Given/When)
  const hasCondition = /\b(given|when|during|in|after|before|upon)\b/i.test(goalText);
  if (!hasCondition) {
    issues.push('Goal should specify conditions under which behavior will occur (e.g., "Given...", "When...")');
  }

  // Check for criteria
  const hasCriteria = /\b(\d+\s*%|percent|out of|trials?|times?|occasions?)\b/i.test(goalText);
  if (!hasCriteria) {
    issues.push('Goal should specify clear criteria for success (e.g., "with 80% accuracy")');
  }

  // Check reasonable length
  if (goalText.length < 50) {
    issues.push('Goal may be too brief to include all required components');
  }

  if (goalText.length > 500) {
    issues.push('Goal may be too long - consider breaking into multiple goals');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Validate objectives
 */
function validateObjectives(
  objectives: Array<{ objectiveText: string; measurementCriteria?: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!objectives || objectives.length === 0) {
    issues.push({
      type: 'warning',
      code: 'NO_OBJECTIVES',
      message: 'No short-term objectives defined',
      comarReference: 'COMAR 13A.05.01.09',
      suggestion: 'Add 2-4 short-term objectives to break down the annual goal',
    });
    return issues;
  }

  if (objectives.length < 2) {
    issues.push({
      type: 'warning',
      code: 'FEW_OBJECTIVES',
      message: 'Only one objective defined',
      suggestion: 'Consider adding more objectives to track incremental progress',
    });
  }

  objectives.forEach((obj, index) => {
    const measurability = checkMeasurability(obj.objectiveText);
    if (!measurability.passed) {
      issues.push({
        type: 'warning',
        code: 'OBJECTIVE_NOT_MEASURABLE',
        message: `Objective ${index + 1} may not be fully measurable`,
        suggestion: `Add: ${measurability.missing.join(', ')}`,
      });
    }

    if (!obj.measurementCriteria) {
      issues.push({
        type: 'suggestion',
        code: 'MISSING_MEASUREMENT',
        message: `Objective ${index + 1} lacks explicit measurement criteria`,
        suggestion: 'Specify how progress will be measured (e.g., teacher observation, work samples)',
      });
    }
  });

  return issues;
}

/**
 * Perform basic rule-based validation
 */
export function validateGoalBasic(goal: GoalForValidation): ValidationResult {
  const issues: ValidationIssue[] = [];
  let score = 100;

  // Check measurability
  const measurability = checkMeasurability(goal.annualGoalText);
  if (!measurability.passed) {
    score -= 20;
    issues.push({
      type: 'error',
      code: 'NOT_MEASURABLE',
      message: 'Goal is not fully measurable',
      comarReference: 'COMAR 13A.05.01.09B(1)',
      suggestion: `Add: ${measurability.missing.join('; ')}`,
    });
  }

  // Check structure
  const structure = checkGoalStructure(goal.annualGoalText);
  if (!structure.passed) {
    score -= 15;
    structure.issues.forEach((issue) => {
      issues.push({
        type: 'warning',
        code: 'STRUCTURE_ISSUE',
        message: issue,
        comarReference: 'COMAR 13A.05.01.09B',
      });
    });
  }

  // Check baseline
  if (!goal.baselineDescription || goal.baselineDescription.length < 10) {
    score -= 10;
    issues.push({
      type: 'warning',
      code: 'MISSING_BASELINE',
      message: 'Baseline data is missing or insufficient',
      comarReference: 'COMAR 13A.05.01.09',
      suggestion: 'Include current performance level with specific data',
    });
  }

  // Validate objectives
  if (goal.objectives) {
    const objectiveIssues = validateObjectives(goal.objectives);
    issues.push(...objectiveIssues);
    score -= objectiveIssues.filter((i) => i.type === 'error').length * 10;
    score -= objectiveIssues.filter((i) => i.type === 'warning').length * 5;
  }

  // Determine COMAR compliance
  const comarCompliance = {
    measurable: measurability.passed,
    gradeAligned: true, // Would need curriculum standards database to verify
    needsBased: goal.baselineDescription ? goal.baselineDescription.length > 10 : false,
    geAccessEnabled: /general education|curriculum|grade.?level/i.test(goal.annualGoalText),
  };

  // Add suggestion if not GE-aligned
  if (!comarCompliance.geAccessEnabled) {
    issues.push({
      type: 'suggestion',
      code: 'GE_ACCESS',
      message: 'Consider explicitly connecting goal to general education curriculum access',
      comarReference: 'COMAR 13A.05.01.09B(2)(b)',
    });
  }

  const suggestions: string[] = [];
  issues
    .filter((i) => i.suggestion)
    .forEach((i) => {
      if (i.suggestion) suggestions.push(i.suggestion);
    });

  return {
    isValid: score >= 70 && issues.filter((i) => i.type === 'error').length === 0,
    score: Math.max(0, Math.min(100, score)),
    issues,
    comarCompliance,
    suggestions: [...new Set(suggestions)], // Dedupe
  };
}

/**
 * Perform AI-enhanced validation using GPT
 */
export async function validateGoalWithAI(goal: GoalForValidation): Promise<ValidationResult> {
  // First run basic validation
  const basicResult = validateGoalBasic(goal);

  // Then enhance with AI analysis
  const prompt = `You are a Maryland special education compliance expert reviewing an IEP goal for COMAR compliance.

## Goal to Review
Area: ${goal.area}
Annual Goal: ${goal.annualGoalText}
${goal.baselineDescription ? `Baseline: ${goal.baselineDescription}` : ''}
${goal.studentGrade ? `Student Grade: ${goal.studentGrade}` : ''}
${
  goal.objectives
    ? `
Objectives:
${goal.objectives.map((o, i) => `${i + 1}. ${o.objectiveText}`).join('\n')}`
    : ''
}

## Maryland COMAR 13A.05.01.09 Requirements
- Goals must be measurable annual goals
- Goals must meet the child's needs resulting from the disability
- Goals must enable involvement and progress in general education curriculum
- Goals must include description of how progress will be measured

## Initial Analysis Findings
Score: ${basicResult.score}/100
${basicResult.issues.map((i) => `- [${i.type.toUpperCase()}] ${i.message}`).join('\n')}

## Instructions
Provide additional analysis of this goal. Identify any issues the initial analysis may have missed.

Respond in JSON format:
{
  "additionalIssues": [
    {
      "type": "error|warning|suggestion",
      "message": "Description of issue",
      "suggestion": "How to fix"
    }
  ],
  "strengths": ["List of goal strengths"],
  "overallAssessment": "Brief overall assessment",
  "scoreAdjustment": 0 // -10 to +10 adjustment to initial score
}`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Maryland special education compliance expert. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return basicResult;
    }

    const aiAnalysis = JSON.parse(responseText);

    // Merge AI findings with basic validation
    const mergedIssues = [...basicResult.issues];

    if (Array.isArray(aiAnalysis.additionalIssues)) {
      aiAnalysis.additionalIssues.forEach((issue: { type: string; message: string; suggestion?: string }) => {
        mergedIssues.push({
          type: (issue.type as 'error' | 'warning' | 'suggestion') || 'suggestion',
          code: 'AI_DETECTED',
          message: issue.message,
          suggestion: issue.suggestion,
        });
      });
    }

    // Adjust score
    const adjustedScore = Math.max(
      0,
      Math.min(100, basicResult.score + (aiAnalysis.scoreAdjustment || 0))
    );

    // Add AI strengths as positive suggestions
    const suggestions = [...basicResult.suggestions];
    if (Array.isArray(aiAnalysis.strengths) && aiAnalysis.strengths.length > 0) {
      suggestions.unshift(`Strengths: ${aiAnalysis.strengths.join(', ')}`);
    }

    return {
      isValid: adjustedScore >= 70 && mergedIssues.filter((i) => i.type === 'error').length === 0,
      score: adjustedScore,
      issues: mergedIssues,
      comarCompliance: basicResult.comarCompliance,
      suggestions,
    };
  } catch (error) {
    console.error('AI validation error:', error);
    // Fall back to basic validation
    return basicResult;
  }
}

/**
 * Get quick validation status (for real-time feedback)
 */
export function getQuickValidationStatus(goalText: string): {
  status: 'good' | 'needs-work' | 'incomplete';
  hints: string[];
} {
  const hints: string[] = [];

  if (goalText.length < 30) {
    return { status: 'incomplete', hints: ['Goal text is too short'] };
  }

  const measurability = checkMeasurability(goalText);
  if (!measurability.passed) {
    hints.push(...measurability.missing.slice(0, 2));
  }

  const structure = checkGoalStructure(goalText);
  if (!structure.passed) {
    hints.push(...structure.issues.slice(0, 2));
  }

  if (hints.length === 0) {
    return { status: 'good', hints: ['Goal appears well-structured'] };
  }

  if (hints.length > 2) {
    return { status: 'needs-work', hints: hints.slice(0, 3) };
  }

  return { status: 'needs-work', hints };
}

/**
 * Suggest improvements for a goal
 */
export async function suggestGoalImprovements(
  goal: GoalForValidation
): Promise<{ improvedGoal: string; explanation: string }> {
  const validation = validateGoalBasic(goal);

  if (validation.isValid && validation.score >= 90) {
    return {
      improvedGoal: goal.annualGoalText,
      explanation: 'Goal already meets quality standards',
    };
  }

  const prompt = `You are a Maryland special education expert. Improve this IEP goal to meet COMAR 13A.05.01.09 requirements.

Original Goal (${goal.area}):
${goal.annualGoalText}

Issues identified:
${validation.issues.map((i) => `- ${i.message}`).join('\n')}

Baseline: ${goal.baselineDescription || 'Not provided'}
${goal.studentGrade ? `Grade: ${goal.studentGrade}` : ''}

Requirements:
1. Make the goal measurable with specific criteria
2. Include conditions under which behavior will occur
3. Specify how progress will be measured
4. Connect to general education curriculum when appropriate

Respond in JSON:
{
  "improvedGoal": "The improved goal text",
  "explanation": "Brief explanation of changes made"
}`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a Maryland special education compliance expert. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response');
    }

    const result = JSON.parse(responseText);
    return {
      improvedGoal: result.improvedGoal || goal.annualGoalText,
      explanation: result.explanation || 'Unable to generate explanation',
    };
  } catch (error) {
    console.error('Goal improvement error:', error);
    return {
      improvedGoal: goal.annualGoalText,
      explanation: 'Unable to generate improvements. Please review the validation issues manually.',
    };
  }
}
