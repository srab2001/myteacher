import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  generateMeetingPrepPrompt,
  getDefaultAgenda,
  getParentConcernsLetterTemplate,
  getRecordsRequestEmailTemplate,
  getFollowUpEmailTemplate,
  type MeetingPrepInput,
  type GeneratedMaterials,
  MEETING_TYPE_LABELS,
} from '@/lib/meeting-prep/templates';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      caseId,
      studentAlias,
      meetingType,
      meetingDate,
      attendees,
      concerns,
      desiredOutcomes,
      recentEvaluations,
      currentChallenges,
      currentServices,
      whatsWorking,
      whatsNotWorking,
    } = body as MeetingPrepInput & { studentAlias: string };

    // Validate required fields
    if (!caseId || !meetingType || !meetingDate) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, meetingType, meetingDate' },
        { status: 400 }
      );
    }

    const input: MeetingPrepInput = {
      caseId,
      studentAlias: studentAlias || 'Student',
      meetingType,
      meetingDate,
      attendees: attendees || [],
      concerns: concerns || [],
      desiredOutcomes: desiredOutcomes || [],
      recentEvaluations: recentEvaluations || [],
      currentChallenges: currentChallenges || '',
      currentServices,
      whatsWorking,
      whatsNotWorking,
    };

    let generatedMaterials: GeneratedMaterials;

    // Check if OpenAI API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        // Generate materials using GPT-4o
        const prompt = generateMeetingPrepPrompt(input);

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert special education advocate helping parents prepare for IEP meetings. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        });

        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
          throw new Error('No response from OpenAI');
        }

        const aiResponse = JSON.parse(responseContent);

        // Add IDs to agenda items
        const agendaItems = aiResponse.agenda.items.map(
          (item: { title: string; duration: number; description: string; presenter?: string }, index: number) => ({
            ...item,
            id: `agenda-${index}`,
          })
        );

        generatedMaterials = {
          agenda: {
            items: agendaItems,
            totalDuration: aiResponse.agenda.totalDuration || agendaItems.reduce((sum: number, item: { duration: number }) => sum + item.duration, 0),
            meetingDate,
            meetingType,
          },
          questions: aiResponse.questions,
          parentConcernsLetter: aiResponse.parentConcernsLetter,
          recordsRequestEmail: aiResponse.recordsRequestEmail,
          followUpEmail: aiResponse.followUpEmail,
        };
      } catch (aiError) {
        console.error('OpenAI API error, falling back to templates:', aiError);
        // Fall back to template-based generation
        generatedMaterials = generateFromTemplates(input);
      }
    } else {
      // Use template-based generation when no API key
      generatedMaterials = generateFromTemplates(input);
    }

    // Generate a prep ID
    const prepId = `prep_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // TODO: Store in database with case reference
    // await db.meetingPrep.create({
    //   data: {
    //     id: prepId,
    //     caseId,
    //     materials: generatedMaterials,
    //   },
    // });

    return NextResponse.json({
      prep_id: prepId,
      case_id: caseId,
      meeting_type: meetingType,
      meeting_date: meetingDate,
      generated_materials: generatedMaterials,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating meeting prep materials:', error);
    return NextResponse.json(
      { error: 'Failed to generate meeting preparation materials' },
      { status: 500 }
    );
  }
}

/**
 * Generate materials from templates when AI is not available
 */
function generateFromTemplates(input: MeetingPrepInput): GeneratedMaterials {
  const defaultAgenda = getDefaultAgenda(input.meetingType);
  const agendaItems = defaultAgenda.map((item, index) => ({
    ...item,
    id: `agenda-${index}`,
  }));

  const totalDuration = agendaItems.reduce((sum, item) => sum + item.duration, 0);

  // Generate questions based on concerns
  const questions = generateQuestionsFromConcerns(input);

  return {
    agenda: {
      items: agendaItems,
      totalDuration,
      meetingDate: input.meetingDate,
      meetingType: input.meetingType,
    },
    questions,
    parentConcernsLetter: getParentConcernsLetterTemplate(input),
    recordsRequestEmail: getRecordsRequestEmailTemplate(input),
    followUpEmail: getFollowUpEmailTemplate(input),
  };
}

/**
 * Generate questions based on parent concerns
 */
function generateQuestionsFromConcerns(input: MeetingPrepInput): string[] {
  const baseQuestions = [
    'What is the current data showing regarding my child\'s progress on their IEP goals?',
    'How are the current services and supports being delivered, and are they effective?',
    'What accommodations are being implemented, and how consistently?',
    'How is my child performing compared to grade-level expectations?',
    'What additional supports or services might benefit my child?',
  ];

  const concernQuestions: string[] = [];

  input.concerns.forEach((concern) => {
    switch (concern.area.toLowerCase()) {
      case 'academic progress':
      case 'reading skills':
        concernQuestions.push(
          `What specific interventions are being used to address ${concern.area.toLowerCase()}?`,
          'What reading assessments have been conducted, and what do they show?'
        );
        break;
      case 'math skills':
        concernQuestions.push(
          'What math interventions are currently in place?',
          'How is my child\'s math performance being measured and tracked?'
        );
        break;
      case 'behavior':
        concernQuestions.push(
          'Is a Functional Behavioral Assessment (FBA) needed or has one been conducted?',
          'What strategies in the Behavior Intervention Plan are working or not working?',
          'How are behavioral incidents being documented and communicated to parents?'
        );
        break;
      case 'communication':
        concernQuestions.push(
          'What communication goals are being addressed in therapy?',
          'How can communication strategies be reinforced at home?'
        );
        break;
      case 'social skills':
        concernQuestions.push(
          'What social skills instruction is my child receiving?',
          'How is my child interacting with peers in different settings?'
        );
        break;
      case 'service delivery':
        concernQuestions.push(
          'Are all services being delivered as specified in the IEP?',
          'How are missed sessions being made up?'
        );
        break;
      default:
        concernQuestions.push(
          `What specific strategies are being used to address ${concern.area.toLowerCase()}?`
        );
    }
  });

  // Add meeting-type specific questions
  const meetingTypeQuestions: Record<string, string[]> = {
    initial: [
      'What evaluation data supports the proposed goals and services?',
      'How was the least restrictive environment determined?',
      'When will the first progress report be provided?',
    ],
    annual: [
      'Were all goals from the current IEP addressed?',
      'What changes are recommended based on this year\'s progress?',
      'Should Extended School Year (ESY) services be considered?',
    ],
    triennial: [
      'What do the reevaluation results indicate about my child\'s current needs?',
      'Does my child continue to meet eligibility criteria?',
      'How should services be adjusted based on new evaluation data?',
    ],
    revision: [
      'What specific changes are being proposed and why?',
      'What data supports the need for these changes?',
      'How will we measure if the changes are effective?',
    ],
  };

  return [
    ...baseQuestions,
    ...concernQuestions,
    ...(meetingTypeQuestions[input.meetingType] || []),
  ].slice(0, 15); // Limit to 15 questions
}
