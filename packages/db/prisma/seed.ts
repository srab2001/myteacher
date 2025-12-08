import { PrismaClient, PlanTypeCode, UserRole, GoalArea, ProgressLevel, ServiceType, ServiceSetting } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default admin credentials
const ADMIN_USERNAME = 'stuadmin';
const ADMIN_PASSWORD = 'stuteacher1125';
const ADMIN_EMAIL = 'admin@myteacher.local';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Maryland + HCPSS Jurisdiction
  const mdHcpss = await prisma.jurisdiction.upsert({
    where: {
      stateCode_districtCode: {
        stateCode: 'MD',
        districtCode: 'HCPSS',
      },
    },
    update: {},
    create: {
      stateCode: 'MD',
      stateName: 'Maryland',
      districtCode: 'HCPSS',
      districtName: 'Howard County Public School System',
    },
  });

  console.log('✅ Created jurisdiction:', mdHcpss.districtName);

  // Create Plan Types for the jurisdiction
  const planTypes = [
    {
      code: PlanTypeCode.IEP,
      name: 'Individualized Education Program',
      description:
        'A legally binding document that outlines the special education services and supports a student with a disability will receive.',
    },
    {
      code: PlanTypeCode.FIVE_OH_FOUR,
      name: '504 Plan',
      description:
        'A plan developed to ensure that a child with a disability receives accommodations to ensure academic success and access to the learning environment.',
    },
    {
      code: PlanTypeCode.BEHAVIOR_PLAN,
      name: 'Behavior Intervention Plan',
      description:
        'A plan that identifies problem behaviors, their causes, and strategies to address them.',
    },
  ];

  for (const pt of planTypes) {
    const planType = await prisma.planType.upsert({
      where: {
        jurisdictionId_code: {
          jurisdictionId: mdHcpss.id,
          code: pt.code,
        },
      },
      update: {},
      create: {
        code: pt.code,
        name: pt.name,
        description: pt.description,
        jurisdictionId: mdHcpss.id,
      },
    });
    console.log('✅ Created plan type:', planType.name);
  }

  // Create sample plan schemas for each plan type
  const iepPlanType = await prisma.planType.findFirst({
    where: { code: PlanTypeCode.IEP, jurisdictionId: mdHcpss.id },
  });

  if (iepPlanType) {
    // Comprehensive IEP Schema with all sections
    const iepSchemaFields = {
      sections: [
        {
          key: 'student_information',
          title: 'Student Information',
          order: 1,
          fields: [
            { key: 'student_name', type: 'text', label: 'Student Name', required: true },
            { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
            { key: 'grade_level', type: 'select', label: 'Grade Level', required: true,
              options: ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
            { key: 'disability_category', type: 'select', label: 'Primary Disability Category', required: true,
              options: ['Autism', 'Deaf-Blindness', 'Deafness', 'Developmental Delay', 'Emotional Disturbance',
                        'Hearing Impairment', 'Intellectual Disability', 'Multiple Disabilities',
                        'Orthopedic Impairment', 'Other Health Impairment', 'Specific Learning Disability',
                        'Speech or Language Impairment', 'Traumatic Brain Injury', 'Visual Impairment'] },
            { key: 'iep_meeting_date', type: 'date', label: 'IEP Meeting Date', required: true },
            { key: 'iep_review_date', type: 'date', label: 'Annual Review Date', required: true },
          ]
        },
        {
          key: 'present_levels',
          title: 'Present Levels of Academic Achievement and Functional Performance',
          order: 2,
          fields: [
            { key: 'academic_performance', type: 'textarea', label: 'Academic Performance', required: true,
              placeholder: 'Describe the student\'s current academic performance including strengths and areas of need...' },
            { key: 'functional_performance', type: 'textarea', label: 'Functional Performance', required: true,
              placeholder: 'Describe the student\'s functional performance including daily living skills, social skills, and behavior...' },
            { key: 'parent_concerns', type: 'textarea', label: 'Parent/Guardian Concerns', required: false,
              placeholder: 'Document any concerns expressed by the parent/guardian...' },
            { key: 'effect_on_progress', type: 'textarea', label: 'Effect of Disability on Progress', required: true,
              placeholder: 'Explain how the student\'s disability affects involvement and progress in the general curriculum...' },
          ]
        },
        {
          key: 'goals',
          title: 'Annual Goals',
          order: 3,
          isGoalsSection: true,
          fields: [
            { key: 'goals_list', type: 'goals', label: 'Annual Goals', required: true,
              description: 'Add measurable annual goals that address the student\'s needs.' },
          ]
        },
        {
          key: 'services',
          title: 'Special Education and Related Services',
          order: 4,
          fields: [
            { key: 'special_education_services', type: 'services_table', label: 'Special Education Services', required: true,
              columns: ['Service Type', 'Location', 'Frequency', 'Duration', 'Start Date', 'End Date'] },
            { key: 'related_services', type: 'services_table', label: 'Related Services', required: false,
              columns: ['Service Type', 'Location', 'Frequency', 'Duration', 'Start Date', 'End Date'] },
            { key: 'supplementary_aids', type: 'textarea', label: 'Supplementary Aids and Services', required: false,
              placeholder: 'List any supplementary aids, services, program modifications, or supports for school personnel...' },
          ]
        },
        {
          key: 'placement',
          title: 'Educational Placement',
          order: 5,
          fields: [
            { key: 'placement_decision', type: 'select', label: 'Placement Decision', required: true,
              options: ['General Education (80% or more)', 'Resource Room (40-79%)', 'Separate Class (less than 40%)',
                        'Separate School', 'Residential Facility', 'Home/Hospital'] },
            { key: 'lre_justification', type: 'textarea', label: 'Least Restrictive Environment Justification', required: true,
              placeholder: 'Explain why the student cannot be educated in a less restrictive environment with supplementary aids and services...' },
            { key: 'extended_school_year', type: 'boolean', label: 'Extended School Year Services Required', required: true },
            { key: 'esy_justification', type: 'textarea', label: 'ESY Justification', required: false,
              placeholder: 'If ESY is required, provide justification based on regression/recoupment data...' },
          ]
        }
      ]
    };

    await prisma.planSchema.upsert({
      where: { id: 'iep-schema-v1' },
      update: {
        fields: iepSchemaFields,
      },
      create: {
        id: 'iep-schema-v1',
        version: 1,
        name: 'IEP Standard Form v1',
        description: 'Standard IEP form for Maryland HCPSS - Comprehensive with all required sections',
        planTypeId: iepPlanType.id,
        effectiveFrom: new Date('2024-01-01'),
        fields: iepSchemaFields,
      },
    });
    console.log('✅ Created comprehensive IEP schema with 5 sections');
  }

  // Create 504 Plan Schema
  const fiveOhFourPlanType = await prisma.planType.findFirst({
    where: { code: PlanTypeCode.FIVE_OH_FOUR, jurisdictionId: mdHcpss.id },
  });

  if (fiveOhFourPlanType) {
    const fiveOhFourSchemaFields = {
      sections: [
        {
          key: 'referral_info',
          title: 'Referral Information',
          order: 1,
          fields: [
            { key: 'referral_date', type: 'date', label: 'Referral Date', required: true },
            { key: 'referral_source', type: 'select', label: 'Referral Source', required: true,
              options: ['Parent/Guardian', 'Teacher', 'Counselor', 'Administrator', 'Self', 'Medical Provider', 'Other'] },
            { key: 'reason_for_referral', type: 'textarea', label: 'Reason for Referral', required: true,
              placeholder: 'Describe the concerns that led to this 504 referral...' },
          ]
        },
        {
          key: 'student_profile',
          title: 'Student Profile',
          order: 2,
          fields: [
            { key: 'student_name', type: 'text', label: 'Student Name', required: true },
            { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
            { key: 'grade_level', type: 'select', label: 'Grade Level', required: true,
              options: ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
            { key: 'current_school', type: 'text', label: 'Current School', required: true },
          ]
        },
        {
          key: 'student_strengths',
          title: 'Student Strengths',
          order: 3,
          fields: [
            { key: 'academic_strengths', type: 'textarea', label: 'Academic Strengths', required: true,
              placeholder: 'Describe the student\'s academic strengths...' },
            { key: 'personal_strengths', type: 'textarea', label: 'Personal/Social Strengths', required: false,
              placeholder: 'Describe the student\'s personal and social strengths...' },
            { key: 'interests', type: 'textarea', label: 'Interests and Motivators', required: false,
              placeholder: 'What interests and motivates this student?' },
          ]
        },
        {
          key: 'disability_info',
          title: 'Disability Information',
          order: 4,
          fields: [
            { key: 'disability_type', type: 'text', label: 'Type of Disability/Impairment', required: true },
            { key: 'diagnosis_date', type: 'date', label: 'Date of Diagnosis', required: false },
            { key: 'diagnosing_professional', type: 'text', label: 'Diagnosing Professional', required: false },
            { key: 'major_life_activities_affected', type: 'textarea', label: 'Major Life Activities Affected', required: true,
              placeholder: 'Describe which major life activities are substantially limited (e.g., learning, reading, concentrating, walking, breathing, etc.)...' },
          ]
        },
        {
          key: 'areas_of_concern',
          title: 'Areas of Concern',
          order: 5,
          fields: [
            { key: 'academic_concerns', type: 'textarea', label: 'Academic Concerns', required: true,
              placeholder: 'Describe specific academic areas where the student struggles...' },
            { key: 'behavioral_concerns', type: 'textarea', label: 'Behavioral Concerns', required: false,
              placeholder: 'Describe any behavioral concerns related to the disability...' },
            { key: 'physical_concerns', type: 'textarea', label: 'Physical/Health Concerns', required: false,
              placeholder: 'Describe any physical or health-related concerns...' },
            { key: 'social_emotional_concerns', type: 'textarea', label: 'Social/Emotional Concerns', required: false,
              placeholder: 'Describe any social or emotional concerns...' },
          ]
        },
        {
          key: 'external_supports',
          title: 'External Supports',
          order: 6,
          fields: [
            { key: 'medical_providers', type: 'textarea', label: 'Medical Providers', required: false,
              placeholder: 'List any doctors, specialists, or therapists involved in the student\'s care...' },
            { key: 'medications', type: 'textarea', label: 'Current Medications', required: false,
              placeholder: 'List any medications and their effects on school performance...' },
            { key: 'outside_services', type: 'textarea', label: 'Outside Services/Therapies', required: false,
              placeholder: 'Describe any outside services or therapies the student receives...' },
          ]
        },
        {
          key: 'evaluation_history',
          title: 'Evaluation History',
          order: 7,
          fields: [
            { key: 'previous_evaluations', type: 'textarea', label: 'Previous Evaluations', required: false,
              placeholder: 'List any formal evaluations that have been conducted...' },
            { key: 'data_sources', type: 'textarea', label: 'Data Sources Reviewed', required: true,
              placeholder: 'List the data sources reviewed for this 504 determination (grades, test scores, observations, medical records, etc.)...' },
          ]
        },
        {
          key: 'prior_special_education_status',
          title: 'Prior Special Education Status',
          order: 8,
          fields: [
            { key: 'prior_iep', type: 'boolean', label: 'Previously had an IEP', required: true },
            { key: 'prior_504', type: 'boolean', label: 'Previously had a 504 Plan', required: true },
            { key: 'prior_services_description', type: 'textarea', label: 'Description of Prior Services', required: false,
              placeholder: 'If applicable, describe previous special education or 504 services...' },
          ]
        },
        {
          key: 'health_emotional_trauma',
          title: 'Health, Emotional, and Trauma Considerations',
          order: 9,
          fields: [
            { key: 'health_conditions', type: 'textarea', label: 'Relevant Health Conditions', required: false,
              placeholder: 'Describe any health conditions that affect school performance...' },
            { key: 'trauma_considerations', type: 'textarea', label: 'Trauma Considerations', required: false,
              placeholder: 'Note any trauma-informed considerations (without specific details)...' },
            { key: 'mental_health_supports', type: 'textarea', label: 'Mental Health Supports', required: false,
              placeholder: 'Describe any mental health supports in place...' },
          ]
        },
        {
          key: 'additional_information',
          title: 'Additional Information',
          order: 10,
          fields: [
            { key: 'additional_notes', type: 'textarea', label: 'Additional Notes', required: false,
              placeholder: 'Any other relevant information...' },
            { key: 'parent_input', type: 'textarea', label: 'Parent/Guardian Input', required: false,
              placeholder: 'Document parent/guardian concerns and input...' },
          ]
        },
        {
          key: 'submission_info',
          title: 'Submission Information',
          order: 11,
          fields: [
            { key: 'meeting_date', type: 'date', label: '504 Meeting Date', required: true },
            { key: 'case_manager', type: 'text', label: 'Case Manager/504 Coordinator', required: true },
            { key: 'team_members', type: 'textarea', label: 'Team Members Present', required: true,
              placeholder: 'List all team members present at the 504 meeting...' },
          ]
        },
        {
          key: 'eligibility_determination',
          title: 'Eligibility Determination',
          order: 12,
          fields: [
            { key: 'is_eligible', type: 'select', label: 'Eligibility Determination', required: true,
              options: ['Eligible for 504 Plan', 'Not Eligible', 'Additional Evaluation Needed'] },
            { key: 'eligibility_rationale', type: 'textarea', label: 'Eligibility Rationale', required: true,
              placeholder: 'Explain the basis for the eligibility determination...' },
          ]
        },
        {
          key: 'accommodations_plan',
          title: 'Accommodations and Services',
          order: 13,
          fields: [
            { key: 'classroom_accommodations', type: 'textarea', label: 'Classroom Accommodations', required: true,
              placeholder: 'List specific accommodations for the classroom (e.g., preferential seating, extended time, modified assignments)...' },
            { key: 'testing_accommodations', type: 'textarea', label: 'Testing Accommodations', required: false,
              placeholder: 'List accommodations for testing situations...' },
            { key: 'behavioral_supports', type: 'textarea', label: 'Behavioral Supports', required: false,
              placeholder: 'List any behavioral supports or interventions...' },
            { key: 'physical_accommodations', type: 'textarea', label: 'Physical/Environmental Accommodations', required: false,
              placeholder: 'List any physical or environmental accommodations...' },
            { key: 'health_accommodations', type: 'textarea', label: 'Health-Related Accommodations', required: false,
              placeholder: 'List any health-related accommodations...' },
            { key: 'plan_review_date', type: 'date', label: 'Plan Review Date', required: true },
          ]
        }
      ]
    };

    await prisma.planSchema.upsert({
      where: { id: '504-schema-v1' },
      update: {
        fields: fiveOhFourSchemaFields,
      },
      create: {
        id: '504-schema-v1',
        version: 1,
        name: '504 Plan Standard Form v1',
        description: 'Standard 504 Plan form for Maryland HCPSS - Comprehensive with all required sections',
        planTypeId: fiveOhFourPlanType.id,
        effectiveFrom: new Date('2024-01-01'),
        fields: fiveOhFourSchemaFields,
      },
    });
    console.log('✅ Created comprehensive 504 Plan schema with 13 sections');
  }

  // Create Behavior Intervention Plan Schema
  const behaviorPlanType = await prisma.planType.findFirst({
    where: { code: PlanTypeCode.BEHAVIOR_PLAN, jurisdictionId: mdHcpss.id },
  });

  if (behaviorPlanType) {
    const behaviorSchemaFields = {
      sections: [
        {
          key: 'student_information',
          title: 'Student Information',
          order: 1,
          fields: [
            { key: 'student_name', type: 'text', label: 'Student Name', required: true },
            { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
            { key: 'grade_level', type: 'select', label: 'Grade Level', required: true,
              options: ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
            { key: 'current_school', type: 'text', label: 'Current School', required: true },
            { key: 'plan_date', type: 'date', label: 'Plan Development Date', required: true },
          ]
        },
        {
          key: 'plan_reason',
          title: 'Reason for Plan',
          order: 2,
          fields: [
            { key: 'referral_reason', type: 'textarea', label: 'Reason for BIP Referral', required: true,
              placeholder: 'Describe the circumstances that led to the development of this behavior plan...' },
            { key: 'fba_conducted', type: 'boolean', label: 'Functional Behavior Assessment (FBA) Conducted', required: true },
            { key: 'fba_date', type: 'date', label: 'FBA Date', required: false },
            { key: 'fba_summary', type: 'textarea', label: 'FBA Summary', required: false,
              placeholder: 'Summarize the key findings from the FBA...' },
          ]
        },
        {
          key: 'behavior_definition',
          title: 'Target Behavior Definition',
          order: 3,
          isBehaviorTargetsSection: true,
          fields: [
            { key: 'target_behaviors', type: 'behavior_targets', label: 'Target Behaviors', required: true,
              description: 'Define the specific behaviors to be addressed with operational definitions.' },
          ]
        },
        {
          key: 'triggers_patterns',
          title: 'Triggers and Patterns',
          order: 4,
          fields: [
            { key: 'antecedents', type: 'textarea', label: 'Common Antecedents/Triggers', required: true,
              placeholder: 'What typically happens before the behavior occurs?' },
            { key: 'setting_events', type: 'textarea', label: 'Setting Events', required: false,
              placeholder: 'What environmental or contextual factors contribute to the behavior?' },
            { key: 'behavior_function', type: 'select', label: 'Hypothesized Function of Behavior', required: true,
              options: ['Attention-Seeking', 'Escape/Avoidance', 'Access to Tangibles', 'Sensory Stimulation', 'Multiple Functions', 'Unknown'] },
            { key: 'function_explanation', type: 'textarea', label: 'Function Explanation', required: true,
              placeholder: 'Explain how this function was determined and provide supporting evidence...' },
          ]
        },
        {
          key: 'replacement_behavior',
          title: 'Replacement Behaviors',
          order: 5,
          fields: [
            { key: 'replacement_behaviors', type: 'textarea', label: 'Replacement Behaviors', required: true,
              placeholder: 'What appropriate behaviors will the student be taught as alternatives?' },
            { key: 'teaching_strategies', type: 'textarea', label: 'Teaching Strategies', required: true,
              placeholder: 'How will replacement behaviors be taught?' },
          ]
        },
        {
          key: 'instructional_supports',
          title: 'Instructional Supports',
          order: 6,
          fields: [
            { key: 'proactive_strategies', type: 'textarea', label: 'Proactive/Prevention Strategies', required: true,
              placeholder: 'What strategies will be used to prevent the behavior from occurring?' },
            { key: 'visual_supports', type: 'textarea', label: 'Visual Supports', required: false,
              placeholder: 'What visual supports will be used?' },
            { key: 'social_skills_instruction', type: 'textarea', label: 'Social Skills Instruction', required: false,
              placeholder: 'What social skills will be explicitly taught?' },
          ]
        },
        {
          key: 'environmental_supports',
          title: 'Environmental Supports',
          order: 7,
          fields: [
            { key: 'classroom_modifications', type: 'textarea', label: 'Classroom Modifications', required: true,
              placeholder: 'What changes to the physical environment will support the student?' },
            { key: 'schedule_modifications', type: 'textarea', label: 'Schedule Modifications', required: false,
              placeholder: 'What changes to the daily schedule or transitions will help?' },
            { key: 'seating_arrangements', type: 'textarea', label: 'Seating Arrangements', required: false,
              placeholder: 'Describe optimal seating arrangements...' },
          ]
        },
        {
          key: 'response_steps',
          title: 'Response Procedures',
          order: 8,
          fields: [
            { key: 'reinforcement_strategies', type: 'textarea', label: 'Reinforcement Strategies', required: true,
              placeholder: 'How will appropriate behavior be reinforced?' },
            { key: 'reinforcement_schedule', type: 'text', label: 'Reinforcement Schedule', required: false,
              placeholder: 'e.g., Continuous, Fixed Ratio, Variable Interval' },
            { key: 'preferred_reinforcers', type: 'textarea', label: 'Preferred Reinforcers', required: false,
              placeholder: 'What reinforcers are most motivating for this student?' },
            { key: 'response_to_behavior', type: 'textarea', label: 'Response to Target Behavior', required: true,
              placeholder: 'How should staff respond when the target behavior occurs?' },
            { key: 'de_escalation_strategies', type: 'textarea', label: 'De-escalation Strategies', required: true,
              placeholder: 'What strategies should be used to de-escalate the situation?' },
          ]
        },
        {
          key: 'safety_steps',
          title: 'Safety Procedures',
          order: 9,
          fields: [
            { key: 'safety_concerns', type: 'textarea', label: 'Safety Concerns', required: false,
              placeholder: 'Are there any safety concerns associated with the behavior?' },
            { key: 'crisis_plan', type: 'textarea', label: 'Crisis Intervention Plan', required: false,
              placeholder: 'What procedures should be followed if the behavior escalates to a crisis level?' },
            { key: 'emergency_contacts', type: 'textarea', label: 'Emergency Contacts', required: false,
              placeholder: 'Who should be contacted in an emergency?' },
          ]
        },
        {
          key: 'parent_engagement',
          title: 'Family/Home Component',
          order: 10,
          fields: [
            { key: 'home_strategies', type: 'textarea', label: 'Home Strategies', required: false,
              placeholder: 'What strategies can be implemented at home?' },
            { key: 'communication_plan', type: 'textarea', label: 'Home-School Communication Plan', required: true,
              placeholder: 'How will school and home communicate about behavior?' },
            { key: 'parent_training', type: 'textarea', label: 'Parent Training Needs', required: false,
              placeholder: 'What training or support do parents need?' },
          ]
        },
        {
          key: 'monitoring_data_collection',
          title: 'Data Collection and Monitoring',
          order: 11,
          fields: [
            { key: 'data_collection_method', type: 'select', label: 'Primary Data Collection Method', required: true,
              options: ['Frequency Count', 'Duration Recording', 'Interval Recording', 'Rating Scale', 'ABC Data', 'Multiple Methods'] },
            { key: 'data_collection_details', type: 'textarea', label: 'Data Collection Procedures', required: true,
              placeholder: 'Describe specifically how data will be collected...' },
            { key: 'responsible_staff', type: 'textarea', label: 'Staff Responsible for Data Collection', required: true,
              placeholder: 'Who will collect data and how often?' },
            { key: 'data_review_frequency', type: 'select', label: 'Data Review Frequency', required: true,
              options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'] },
          ]
        },
        {
          key: 'review_schedule',
          title: 'Review and Modification',
          order: 12,
          fields: [
            { key: 'plan_review_date', type: 'date', label: 'Next Plan Review Date', required: true },
            { key: 'success_criteria', type: 'textarea', label: 'Success Criteria', required: true,
              placeholder: 'What measurable criteria will indicate the plan is successful?' },
            { key: 'modification_triggers', type: 'textarea', label: 'Triggers for Plan Modification', required: false,
              placeholder: 'Under what circumstances should the plan be modified?' },
            { key: 'team_members', type: 'textarea', label: 'BIP Team Members', required: true,
              placeholder: 'List all team members involved in developing and implementing this plan...' },
          ]
        }
      ]
    };

    await prisma.planSchema.upsert({
      where: { id: 'behavior-plan-schema-v1' },
      update: {
        fields: behaviorSchemaFields,
      },
      create: {
        id: 'behavior-plan-schema-v1',
        version: 1,
        name: 'Behavior Intervention Plan Standard Form v1',
        description: 'Standard BIP form for Maryland HCPSS - Comprehensive with FBA integration',
        planTypeId: behaviorPlanType.id,
        effectiveFrom: new Date('2024-01-01'),
        fields: behaviorSchemaFields,
      },
    });
    console.log('✅ Created comprehensive Behavior Intervention Plan schema with 12 sections');
  }

  // Create default admin user with local auth
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminUser = await prisma.appUser.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      passwordHash, // Update password on re-seed
    },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
      email: ADMIN_EMAIL,
      displayName: 'System Administrator',
      role: UserRole.ADMIN,
      stateCode: 'MD',
      districtName: 'Howard County Public School System',
      schoolName: 'District Office',
      jurisdictionId: mdHcpss.id,
      isOnboarded: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.username);

  // Create sample students for testing
  const sampleStudents = [
    {
      recordId: 'HCPSS-000001',
      externalId: 'SIS-12345',
      firstName: 'Alex',
      lastName: 'Johnson',
      dateOfBirth: new Date('2015-03-15'),
      grade: '4',
      schoolName: 'Centennial Elementary',
    },
    {
      recordId: 'HCPSS-000002',
      externalId: 'SIS-12346',
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: new Date('2014-07-22'),
      grade: '5',
      schoolName: 'Centennial Elementary',
    },
    {
      recordId: 'HCPSS-000003',
      externalId: null,
      firstName: 'James',
      lastName: 'Williams',
      dateOfBirth: new Date('2013-11-08'),
      grade: '6',
      schoolName: 'Wilde Lake Middle',
    },
  ];

  for (const studentData of sampleStudents) {
    const student = await prisma.student.upsert({
      where: { recordId: studentData.recordId },
      update: {},
      create: {
        ...studentData,
        jurisdictionId: mdHcpss.id,
        teacherId: adminUser.id,
      },
    });

    // Add initial overall status for each student
    const existingStatus = await prisma.studentStatus.findFirst({
      where: { studentId: student.id, scope: 'OVERALL' },
    });

    if (!existingStatus) {
      await prisma.studentStatus.create({
        data: {
          studentId: student.id,
          scope: 'OVERALL',
          code: 'ON_TRACK',
          summary: 'Initial status - student is meeting expectations',
          effectiveDate: new Date(),
          updatedById: adminUser.id,
        },
      });
    }

    console.log('✅ Created sample student:', student.firstName, student.lastName);
  }

  // Create sample IEP plans with goals for testing
  if (iepPlanType) {
    const iepSchema = await prisma.planSchema.findFirst({
      where: { id: 'iep-schema-v1' },
    });

    if (iepSchema) {
      const firstStudent = await prisma.student.findFirst({
        where: { recordId: 'HCPSS-000001' },
      });

      if (firstStudent) {
        // Create IEP plan instance
        const iepPlan = await prisma.planInstance.upsert({
          where: { id: 'sample-iep-plan-1' },
          update: {},
          create: {
            id: 'sample-iep-plan-1',
            studentId: firstStudent.id,
            planTypeId: iepPlanType.id,
            schemaId: iepSchema.id,
            startDate: new Date('2024-01-15'),
            endDate: new Date('2025-01-14'),
            status: 'ACTIVE',
          },
        });

        console.log('✅ Created sample IEP plan for', firstStudent.firstName);

        // Create sample goals
        const sampleGoals = [
          {
            goalCode: 'GOAL-1',
            area: GoalArea.READING,
            annualGoalText: 'By the end of the IEP period, Alex will improve reading fluency from 45 words per minute to 85 words per minute with 95% accuracy as measured by curriculum-based assessments.',
            baselineJson: { currentLevel: '45 wpm', accuracy: '85%', assessmentDate: '2024-01-10' },
            progressSchedule: 'monthly',
          },
          {
            goalCode: 'GOAL-2',
            area: GoalArea.MATH,
            annualGoalText: 'By the end of the IEP period, Alex will solve multi-digit addition and subtraction problems with regrouping with 80% accuracy across 4 out of 5 trials.',
            baselineJson: { currentLevel: '40% accuracy', assessmentDate: '2024-01-10' },
            progressSchedule: 'weekly',
          },
          {
            goalCode: 'GOAL-3',
            area: GoalArea.SOCIAL_EMOTIONAL,
            annualGoalText: 'By the end of the IEP period, Alex will use appropriate conflict resolution strategies in 4 out of 5 peer conflict situations as observed by staff.',
            baselineJson: { currentLevel: '1 out of 5 situations', observations: '2024-01-08 to 2024-01-12' },
            progressSchedule: 'weekly',
          },
        ];

        for (const goalData of sampleGoals) {
          const goal = await prisma.goal.upsert({
            where: {
              planInstanceId_goalCode: {
                planInstanceId: iepPlan.id,
                goalCode: goalData.goalCode,
              },
            },
            update: {},
            create: {
              ...goalData,
              planInstanceId: iepPlan.id,
              targetDate: new Date('2025-01-14'),
            },
          });

          // Add sample progress records
          const progressDates = [
            new Date('2024-02-01'),
            new Date('2024-03-01'),
            new Date('2024-04-01'),
          ];

          const progressLevels = [
            ProgressLevel.FULL_SUPPORT,
            ProgressLevel.SOME_SUPPORT,
            ProgressLevel.LOW_SUPPORT,
          ];

          for (let i = 0; i < progressDates.length; i++) {
            await prisma.goalProgress.create({
              data: {
                goalId: goal.id,
                date: progressDates[i]!,
                quickSelect: progressLevels[i]!,
                comment: `Progress check ${i + 1} - Student showing ${i === 2 ? 'good' : 'steady'} improvement.`,
                recordedById: adminUser.id,
              },
            });
          }

          console.log('✅ Created goal with progress:', goalData.goalCode);
        }

        // Add sample service logs
        const serviceLogs = [
          { date: new Date('2024-02-05'), minutes: 45, serviceType: ServiceType.SPECIAL_EDUCATION, setting: ServiceSetting.RESOURCE_ROOM },
          { date: new Date('2024-02-07'), minutes: 45, serviceType: ServiceType.SPECIAL_EDUCATION, setting: ServiceSetting.RESOURCE_ROOM },
          { date: new Date('2024-02-12'), minutes: 30, serviceType: ServiceType.SPEECH_LANGUAGE, setting: ServiceSetting.THERAPY_ROOM },
          { date: new Date('2024-02-14'), minutes: 45, serviceType: ServiceType.SPECIAL_EDUCATION, setting: ServiceSetting.RESOURCE_ROOM },
        ];

        for (const log of serviceLogs) {
          await prisma.serviceLog.create({
            data: {
              ...log,
              planInstanceId: iepPlan.id,
              providerId: adminUser.id,
              notes: `Regular session - student engaged and participated well.`,
            },
          });
        }

        console.log('✅ Created sample service logs');
      }
    }
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
