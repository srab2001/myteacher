// Export types from types.ts
export type {
  MeetingType,
  Concern,
  AgendaItem,
  MeetingPrepFormData,
  GeneratedMaterials,
  MeetingPrep,
  MaterialType,
} from './types';
export { MATERIAL_LABELS } from './types';

// Export templates - use explicit exports to avoid conflicts
export type { MeetingPrepInput } from './templates';
export {
  MEETING_TYPE_LABELS,
  COMMON_DESIRED_OUTCOMES,
  COMMON_CONCERN_AREAS,
  generateMeetingPrepPrompt,
  getDefaultAgenda,
  getParentConcernsLetterTemplate,
  getRecordsRequestEmailTemplate,
  getFollowUpEmailTemplate,
} from './templates';
