import { prisma } from '../lib/db.js';
import { queryChunksForGeneration, getSectionTagsForPlanType } from './ingestion.js';

// Section tag to field mapping for different plan types
const SECTION_TO_FIELD_MAP: Record<string, Record<string, string[]>> = {
  IEP: {
    present_levels: ['academic_performance', 'functional_performance'],
    present_levels_academic: ['academic_performance'],
    present_levels_functional: ['functional_performance'],
    goals: ['goals_list'],
    goals_reading: ['goals_list'],
    goals_math: ['goals_list'],
    goals_writing: ['goals_list'],
    goals_communication: ['goals_list'],
    goals_social_emotional: ['goals_list'],
    goals_behavior: ['goals_list'],
    objectives: ['goals_list'],
    accommodations: ['supplementary_aids'],
    modifications: ['supplementary_aids'],
    services: ['special_education_services'],
    services_related: ['related_services'],
    supplementary_aids: ['supplementary_aids'],
    placement: ['placement_decision'],
    placement_lre: ['lre_justification'],
    transition: ['transition'],
    esy: ['extended_school_year', 'esy_justification'],
    parent_concerns: ['parent_concerns'],
  },
  FIVE_OH_FOUR: {
    disability: ['disability_description'],
    major_life_activities: ['major_life_activities'],
    accommodations: ['accommodations'],
    accommodations_classroom: ['classroom_accommodations'],
    accommodations_testing: ['testing_accommodations'],
    accommodations_physical: ['physical_accommodations'],
    health_plan: ['health_plan'],
    emergency_plan: ['emergency_plan'],
    medication: ['medication'],
  },
  BEHAVIOR_PLAN: {
    target_behavior: ['target_behavior', 'behavior_description'],
    function_analysis: ['function_of_behavior'],
    antecedents: ['antecedents', 'triggers'],
    consequences: ['consequences'],
    replacement_behavior: ['replacement_behavior'],
    prevention_strategies: ['prevention_strategies'],
    teaching_strategies: ['teaching_strategies'],
    response_strategies: ['response_plan'],
    reinforcement: ['reinforcement_strategies'],
    crisis_plan: ['crisis_plan'],
    deescalation: ['deescalation_strategies'],
    data_collection: ['data_collection'],
    progress_monitoring: ['progress_monitoring'],
  },
};

export interface GenerateDraftParams {
  planId: string;
  sectionKey: string;
  fieldKey: string;
  studentContext?: {
    grade?: string;
    firstName?: string;
    needDescription?: string;
  };
  userPrompt?: string;
}

export interface GeneratedDraft {
  text: string;
  sourceChunkIds: string[];
  sectionTag: string;
}

/**
 * Determine the appropriate section tag for a field
 */
function getSectionTagForField(planTypeCode: string, fieldKey: string): string | null {
  const mapping = SECTION_TO_FIELD_MAP[planTypeCode];
  if (!mapping) return null;

  for (const [sectionTag, fields] of Object.entries(mapping)) {
    if (fields.includes(fieldKey)) {
      return sectionTag;
    }
  }

  return null;
}

/**
 * Get grade band from a grade string
 */
function getGradeBand(grade: string | undefined): string | null {
  if (!grade) return null;

  const gradeNum = grade.toLowerCase().replace(/[^0-9k]/g, '');

  if (gradeNum === 'k' || gradeNum === '0' || gradeNum === '1' || gradeNum === '2') {
    return 'K-2';
  }
  if (['3', '4', '5'].includes(gradeNum)) {
    return '3-5';
  }
  if (['6', '7', '8'].includes(gradeNum)) {
    return '6-8';
  }
  if (['9', '10', '11', '12'].includes(gradeNum)) {
    return '9-12';
  }

  return null;
}

/**
 * Build a prompt for the content engine using best practice chunks
 */
function buildContentPrompt(params: {
  planTypeCode: string;
  sectionTag: string;
  fieldKey: string;
  chunks: Array<{ text: string; gradeBand: string | null }>;
  studentContext?: {
    grade?: string;
    firstName?: string;
    needDescription?: string;
  };
  userPrompt?: string;
}): string {
  const { planTypeCode, sectionTag, fieldKey, chunks, studentContext, userPrompt } = params;

  const planTypeName = {
    IEP: 'IEP (Individualized Education Program)',
    FIVE_OH_FOUR: '504 Plan',
    BEHAVIOR_PLAN: 'Behavior Intervention Plan',
  }[planTypeCode] || planTypeCode;

  let prompt = `You are an expert special education plan writer. Generate professional, compliant content for a ${planTypeName}.\n\n`;

  // Add student context if available
  if (studentContext) {
    prompt += `## Student Information\n`;
    if (studentContext.firstName) prompt += `- Student: ${studentContext.firstName}\n`;
    if (studentContext.grade) prompt += `- Grade: ${studentContext.grade}\n`;
    if (studentContext.needDescription) prompt += `- Need: ${studentContext.needDescription}\n`;
    prompt += '\n';
  }

  // Add section context
  prompt += `## Section: ${sectionTag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n`;
  prompt += `Field: ${fieldKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;

  // Add reference examples from best practice documents
  if (chunks.length > 0) {
    prompt += `## Reference Examples from Best Practice Documents\n`;
    prompt += `Use these examples as reference for style, format, and level of detail:\n\n`;

    chunks.forEach((chunk, index) => {
      prompt += `### Example ${index + 1}`;
      if (chunk.gradeBand) prompt += ` (Grade Band: ${chunk.gradeBand})`;
      prompt += `\n${chunk.text}\n\n`;
    });
  }

  // Add user-specific prompt if provided
  if (userPrompt) {
    prompt += `## Specific Request\n${userPrompt}\n\n`;
  }

  // Add instructions
  prompt += `## Instructions\n`;
  prompt += `Generate appropriate content for the ${fieldKey.replace(/_/g, ' ')} field.\n`;
  prompt += `- Use professional, clear language appropriate for special education documentation\n`;
  prompt += `- Follow the style and format of the reference examples\n`;
  prompt += `- Make the content specific to the student's grade level and needs\n`;
  prompt += `- Ensure compliance with IDEA and best practices\n`;
  prompt += `- Keep the response focused and actionable\n\n`;

  prompt += `Generate only the content for this field. Do not include explanations or headers.`;

  return prompt;
}

/**
 * Generate draft content for a plan field using best practice examples
 */
export async function generateDraftContent(params: GenerateDraftParams): Promise<GeneratedDraft | null> {
  // Get plan details
  const plan = await prisma.planInstance.findUnique({
    where: { id: params.planId },
    include: {
      planType: true,
      student: true,
    },
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const planTypeCode = plan.planType.code;
  const sectionTag = getSectionTagForField(planTypeCode, params.fieldKey) || params.sectionKey;

  // Get grade band
  const gradeBand = getGradeBand(plan.student.grade);

  // Query relevant chunks
  const chunks = await queryChunksForGeneration({
    planTypeCode,
    sectionTag,
    jurisdictionId: plan.student.jurisdictionId,
    gradeBand: gradeBand || undefined,
    limit: 3,
  });

  if (chunks.length === 0) {
    // Try with a more generic section tag
    const genericTag = sectionTag.split('_')[0] || sectionTag;
    const genericChunks = await queryChunksForGeneration({
      planTypeCode,
      sectionTag: genericTag,
      limit: 3,
    });

    if (genericChunks.length === 0) {
      return null; // No reference material available
    }

    chunks.push(...genericChunks);
  }

  // Build the prompt
  const prompt = buildContentPrompt({
    planTypeCode,
    sectionTag,
    fieldKey: params.fieldKey,
    chunks: chunks.map(c => ({ text: c.text, gradeBand: c.gradeBand })),
    studentContext: {
      grade: plan.student.grade,
      firstName: plan.student.firstName,
      needDescription: params.studentContext?.needDescription,
    },
    userPrompt: params.userPrompt,
  });

  // For now, return a placeholder indicating the prompt was built
  // In production, this would call an LLM API
  // The actual LLM integration would be added based on your chosen provider

  // Return the built prompt as draft text for now (to be replaced with LLM call)
  return {
    text: `[Draft generation ready - ${chunks.length} reference examples found]\n\nThis would call the LLM with the following context:\n- Plan Type: ${planTypeCode}\n- Section: ${sectionTag}\n- Field: ${params.fieldKey}\n- Grade: ${plan.student.grade}\n- Reference chunks: ${chunks.length}`,
    sourceChunkIds: chunks.map(c => c.id),
    sectionTag,
  };
}

/**
 * Get available sections for content generation for a plan type
 */
export function getGeneratableSections(planTypeCode: string): string[] {
  return getSectionTagsForPlanType(planTypeCode);
}

/**
 * Check if content generation is available for a field
 */
export async function hasReferenceContent(params: {
  planTypeCode: string;
  sectionTag: string;
  jurisdictionId?: string;
}): Promise<boolean> {
  const count = await prisma.bestPracticeChunk.count({
    where: {
      planTypeCode: params.planTypeCode,
      sectionTag: params.sectionTag,
      document: {
        isActive: true,
        ingestionStatus: 'COMPLETE',
      },
    },
  });

  return count > 0;
}
