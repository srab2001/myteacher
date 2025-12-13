export const BIP_PREFIX = 'bip_' as const;

export const BIP_STUDENT_FIELDS = {
  NAME: 'bip_student_name',
  SCHOOL_ID: 'bip_student_school_id',
} as const;

export const BIP_PLAN_HEADER_FIELDS = {
  PLAN_DATE: 'bip_plan_date',
  TEAM_MEMBERS: 'bip_team_members',
  SETTING_CONTEXT: 'bip_setting_context',
} as const;

export const BIP_TARGET_BEHAVIOR_FIELDS = {
  BEHAVIOR_1_DEFINITION: 'bip_behavior_1_definition',
  BEHAVIOR_2_DEFINITION: 'bip_behavior_2_definition',
  BEHAVIOR_3_DEFINITION: 'bip_behavior_3_definition',
} as const;

export const BIP_BASELINE_FIELDS = {
  BASELINE_SUMMARY: 'bip_baseline_summary',
  DATA_SOURCES: 'bip_data_sources',
} as const;

export const BIP_FBA_FIELDS = {
  FBA_COMPLETED_FLAG: 'bip_fba_completed_flag',
  FBA_DATE: 'bip_fba_date',
  FUNCTION_OF_BEHAVIOR: 'bip_function_of_behavior',
} as const;

export const BIP_TRIGGERS_FIELDS = {
  TRIGGERS: 'bip_triggers',
  ANTECEDENTS: 'bip_antecedents',
  CONSEQUENCES: 'bip_consequences',
} as const;

export const BIP_REPLACEMENT_FIELDS = {
  REPLACEMENT_BEHAVIORS: 'bip_replacement_behaviors',
  SKILLS_TO_TEACH: 'bip_skills_to_teach',
  TEACHING_PLAN: 'bip_teaching_plan',
} as const;

export const BIP_PREVENTION_FIELDS = {
  ENVIRONMENT_CHANGES: 'bip_environment_changes',
  SCHEDULE_ROUTINE_SUPPORTS: 'bip_schedule_routine_supports',
  STAFF_SUPPORTS: 'bip_staff_supports',
} as const;

export const BIP_REINFORCEMENT_FIELDS = {
  REINFORCEMENT_STRATEGY: 'bip_reinforcement_strategy',
  REINFORCEMENT_SCHEDULE: 'bip_reinforcement_schedule',
} as const;

export const BIP_RESPONSE_FIELDS = {
  STAFF_RESPONSE_STEPS: 'bip_staff_response_steps',
  DEESCALATION_STEPS: 'bip_deescalation_steps',
} as const;

export const BIP_CRISIS_FIELDS = {
  CRISIS_PROCEDURES: 'bip_crisis_procedures',
  RESTRAINT_CONSIDERATIONS_FLAG: 'bip_restraint_considerations_flag',
  PARENT_NOTIFICATION_STEPS: 'bip_parent_notification_steps',
} as const;

export const BIP_PROGRESS_FIELDS = {
  PROGRESS_MONITORING_METHOD: 'bip_progress_monitoring_method',
  PROGRESS_REVIEW_FREQUENCY: 'bip_progress_review_frequency',
  PROGRESS_REPORTING: 'bip_progress_reporting',
} as const;

export const BIP_SIGNOFF_FIELDS = {
  SIGNATURES: 'bip_signatures',
} as const;

export const BIP_CANONICAL_FIELD_KEYS = new Set([
  BIP_STUDENT_FIELDS.NAME,
  BIP_STUDENT_FIELDS.SCHOOL_ID,
  BIP_PLAN_HEADER_FIELDS.PLAN_DATE,
  BIP_PLAN_HEADER_FIELDS.TEAM_MEMBERS,
  BIP_PLAN_HEADER_FIELDS.SETTING_CONTEXT,
  BIP_TARGET_BEHAVIOR_FIELDS.BEHAVIOR_1_DEFINITION,
  BIP_TARGET_BEHAVIOR_FIELDS.BEHAVIOR_2_DEFINITION,
  BIP_TARGET_BEHAVIOR_FIELDS.BEHAVIOR_3_DEFINITION,
  BIP_BASELINE_FIELDS.BASELINE_SUMMARY,
  BIP_BASELINE_FIELDS.DATA_SOURCES,
  BIP_FBA_FIELDS.FBA_COMPLETED_FLAG,
  BIP_FBA_FIELDS.FBA_DATE,
  BIP_FBA_FIELDS.FUNCTION_OF_BEHAVIOR,
  BIP_TRIGGERS_FIELDS.TRIGGERS,
  BIP_TRIGGERS_FIELDS.ANTECEDENTS,
  BIP_TRIGGERS_FIELDS.CONSEQUENCES,
  BIP_REPLACEMENT_FIELDS.REPLACEMENT_BEHAVIORS,
  BIP_REPLACEMENT_FIELDS.SKILLS_TO_TEACH,
  BIP_REPLACEMENT_FIELDS.TEACHING_PLAN,
  BIP_PREVENTION_FIELDS.ENVIRONMENT_CHANGES,
  BIP_PREVENTION_FIELDS.SCHEDULE_ROUTINE_SUPPORTS,
  BIP_PREVENTION_FIELDS.STAFF_SUPPORTS,
  BIP_REINFORCEMENT_FIELDS.REINFORCEMENT_STRATEGY,
  BIP_REINFORCEMENT_FIELDS.REINFORCEMENT_SCHEDULE,
  BIP_RESPONSE_FIELDS.STAFF_RESPONSE_STEPS,
  BIP_RESPONSE_FIELDS.DEESCALATION_STEPS,
  BIP_CRISIS_FIELDS.CRISIS_PROCEDURES,
  BIP_CRISIS_FIELDS.RESTRAINT_CONSIDERATIONS_FLAG,
  BIP_CRISIS_FIELDS.PARENT_NOTIFICATION_STEPS,
  BIP_PROGRESS_FIELDS.PROGRESS_MONITORING_METHOD,
  BIP_PROGRESS_FIELDS.PROGRESS_REVIEW_FREQUENCY,
  BIP_PROGRESS_FIELDS.PROGRESS_REPORTING,
  BIP_SIGNOFF_FIELDS.SIGNATURES,
]);

export const BIP_CANONICAL_FIELD_KEYS_ARRAY = Array.from(BIP_CANONICAL_FIELD_KEYS);

export function isValidBipFieldKey(key: string): boolean {
  return BIP_CANONICAL_FIELD_KEYS.has(key);
}

export function getInvalidBipFieldKeys(keys: string[]): string[] {
  return keys.filter(key => !BIP_CANONICAL_FIELD_KEYS.has(key));
}

export type BipCanonicalFieldKey = typeof BIP_CANONICAL_FIELD_KEYS_ARRAY[number];
