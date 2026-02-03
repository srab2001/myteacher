/**
 * Types for Meeting Preparation feature
 */

export type MeetingType = 'initial' | 'annual' | 'triennial' | 'revision';

export interface Concern {
  id: string;
  area: string;
  description: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  description: string;
  presenter?: string;
}

export interface MeetingPrepFormData {
  // Step 1: Meeting Details
  studentName?: string;
  meetingType: MeetingType;
  meetingDate: string;
  meetingTime: string;
  location: string;
  attendees: string[];

  // Step 2: Concerns
  concerns: Concern[];

  // Step 3: Desired Outcomes
  desiredOutcomes: string[];
  customOutcomes: string[];

  // Step 4: Current Status
  recentEvaluations: string[];
  currentServices: string;
  whatsWorking: string;
  whatsNotWorking: string;
}

export interface GeneratedMaterials {
  id: string;
  caseId: string;
  createdAt: string;
  updatedAt: string;
  formData: MeetingPrepFormData;
  agenda: {
    items: AgendaItem[];
    totalDuration: number;
  };
  questions: string[];
  parentConcernsLetter: string;
  recordsRequestEmail: string;
  followUpEmail: string;
}

export interface MeetingPrep {
  id: string;
  caseId: string;
  studentAlias: string;
  meetingType: MeetingType;
  meetingDate: string;
  status: 'draft' | 'ready' | 'completed';
  materials: GeneratedMaterials | null;
  createdAt: string;
  updatedAt: string;
}

export type MaterialType =
  | 'agenda'
  | 'questions'
  | 'parentConcernsLetter'
  | 'recordsRequestEmail'
  | 'followUpEmail';

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  agenda: 'Meeting Agenda',
  questions: 'Questions for IEP Team',
  parentConcernsLetter: 'Parent Concerns Letter',
  recordsRequestEmail: 'Records Request Email',
  followUpEmail: 'Follow-Up Email Template',
};
