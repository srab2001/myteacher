import { PrismaClient, PlanTypeCode, UserRole, GoalArea, ProgressLevel, ServiceType, ServiceSetting, FormType, ControlType, OptionsEditableBy } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
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
    // Maryland IEP Schema - Aligned with July 1, 2023 Maryland IEP Template
    // Based on COMAR 13A.05.01.09 and Maryland "Understanding the Evaluation, Eligibility, and IEP Processes" guide
    const iepSchemaFields = {
      sections: [
        // Section 1: Student Information and Eligibility
        {
          key: 'student_information',
          title: 'Student Information and Eligibility',
          order: 1,
          description: 'Basic student identification and eligibility information as required by Maryland COMAR.',
          fields: [
            { key: 'student_name', type: 'text', label: 'Student Name', required: true },
            { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
            { key: 'student_id', type: 'text', label: 'Student ID Number', required: false },
            { key: 'grade_level', type: 'select', label: 'Grade Level', required: true,
              options: ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
            { key: 'school_name', type: 'text', label: 'School Name', required: true },
            { key: 'primary_disability', type: 'select', label: 'Primary Disability Category', required: true,
              description: 'Select the primary disability category under which the student qualifies for special education services.',
              options: ['Autism', 'Deaf-Blindness', 'Deafness', 'Developmental Delay', 'Emotional Disturbance',
                        'Hearing Impairment', 'Intellectual Disability', 'Multiple Disabilities',
                        'Orthopedic Impairment', 'Other Health Impairment', 'Specific Learning Disability',
                        'Speech or Language Impairment', 'Traumatic Brain Injury', 'Visual Impairment'] },
            { key: 'secondary_disability', type: 'select', label: 'Secondary Disability Category (if applicable)', required: false,
              options: ['None', 'Autism', 'Deaf-Blindness', 'Deafness', 'Developmental Delay', 'Emotional Disturbance',
                        'Hearing Impairment', 'Intellectual Disability', 'Multiple Disabilities',
                        'Orthopedic Impairment', 'Other Health Impairment', 'Specific Learning Disability',
                        'Speech or Language Impairment', 'Traumatic Brain Injury', 'Visual Impairment'] },
            { key: 'iep_meeting_date', type: 'date', label: 'IEP Meeting Date', required: true },
            { key: 'iep_initiation_date', type: 'date', label: 'IEP Initiation Date', required: true,
              description: 'Date when IEP services will begin.' },
            { key: 'annual_review_date', type: 'date', label: 'Annual Review Date', required: true },
            { key: 'reevaluation_date', type: 'date', label: 'Reevaluation Date', required: false,
              description: 'Date of next three-year reevaluation.' },
            { key: 'parent_guardian_name', type: 'text', label: 'Parent/Guardian Name', required: true },
            { key: 'parent_guardian_contact', type: 'text', label: 'Parent/Guardian Contact', required: false },
            { key: 'case_manager', type: 'text', label: 'Case Manager', required: true },
          ]
        },
        // Section 2: Present Levels (PLAAFP) - Maryland COMAR 13A.05.01.09
        {
          key: 'present_levels',
          title: 'Present Levels of Academic Achievement and Functional Performance',
          order: 2,
          description: 'Maryland COMAR requires documentation of current performance and how disability affects progress in the general curriculum.',
          fields: [
            { key: 'student_strengths', type: 'textarea', label: 'Student Strengths', required: true,
              placeholder: 'Describe the student\'s strengths, including academic, social, physical, and other areas...',
              description: 'Document the student\'s strengths across all relevant domains.' },
            { key: 'parent_concerns', type: 'textarea', label: 'Parent/Guardian Concerns for Enhancing Education', required: true,
              placeholder: 'Document concerns expressed by the parent/guardian...',
              description: 'Maryland requires documentation of parent concerns about enhancing their child\'s education.' },
            { key: 'academic_performance', type: 'textarea', label: 'Present Level of Academic Performance', required: true,
              placeholder: 'Describe current academic performance in reading, math, written expression, and other areas...',
              description: 'Include current grade-level performance, assessment data, and areas of need.' },
            { key: 'functional_performance', type: 'textarea', label: 'Present Level of Functional Performance', required: true,
              placeholder: 'Describe functional performance including communication, social skills, daily living skills, behavior...',
              description: 'Document performance in non-academic areas affecting educational progress.' },
            { key: 'disability_impact', type: 'textarea', label: 'How Disability Affects Progress in General Curriculum', required: true,
              placeholder: 'Explain how the student\'s disability affects involvement and progress in the general education curriculum...',
              description: 'Maryland requires explanation of how the disability impacts progress toward grade-level standards.' },
            { key: 'preschool_activities', type: 'textarea', label: 'Impact on Participation in Appropriate Activities (Preschool)', required: false,
              placeholder: 'For preschool-age children, describe how disability affects participation in appropriate activities...',
              description: 'Required for preschool-age children instead of general curriculum impact.' },
            { key: 'evaluation_results_summary', type: 'textarea', label: 'Summary of Evaluation Results', required: false,
              placeholder: 'Summarize relevant evaluation results that inform present levels...',
              description: 'Include summary of assessments used to determine present levels.' },
          ]
        },
        // Section 3: Annual Goals - Maryland COMAR 13A.05.01.09B
        {
          key: 'goals',
          title: 'Measurable Annual Goals and Short-Term Objectives',
          order: 3,
          isGoalsSection: true,
          description: 'Maryland requires measurable annual goals designed to meet the child\'s needs from the disability and enable progress in the general curriculum. Each goal must include short-term objectives or benchmarks and describe how progress will be measured and reported.',
          fields: [
            { key: 'goals_list', type: 'goals', label: 'Annual Goals', required: true,
              description: 'Add measurable annual goals. Each goal must include: (1) present level baseline, (2) measurable target, (3) conditions, (4) short-term objectives/benchmarks, (5) progress measurement method, and (6) reporting schedule.' },
          ]
        },
        // Section 4: Special Education and Related Services - Maryland COMAR 13A.05.01.09C
        {
          key: 'services',
          title: 'Special Education, Related Services, and Supplementary Aids',
          order: 4,
          description: 'Maryland COMAR requires documentation of special education services, related services, supplementary aids and services, program modifications, and supports for school personnel.',
          fields: [
            { key: 'special_education_services', type: 'services_table', label: 'Special Education Services', required: true,
              description: 'Services specifically designed to address the unique needs resulting from the disability.',
              columns: ['Service Type', 'Location', 'Frequency', 'Duration', 'Start Date', 'End Date', 'Provider'] },
            { key: 'related_services', type: 'services_table', label: 'Related Services', required: false,
              description: 'Developmental, corrective, and supportive services required for the student to benefit from special education.',
              columns: ['Service Type', 'Location', 'Frequency', 'Duration', 'Start Date', 'End Date', 'Provider'] },
            { key: 'supplementary_aids_services', type: 'textarea', label: 'Supplementary Aids and Services', required: true,
              placeholder: 'List aids, services, and supports provided in general education classes or other settings...',
              description: 'Include supports to enable education with nondisabled peers to the maximum extent appropriate.' },
            { key: 'program_modifications', type: 'textarea', label: 'Program Modifications', required: false,
              placeholder: 'Describe any modifications to the educational program...',
              description: 'Include curricular modifications, modified assignments, etc.' },
            { key: 'supports_for_personnel', type: 'textarea', label: 'Supports for School Personnel', required: false,
              placeholder: 'Describe training or supports for teachers and staff...',
              description: 'Professional development, consultation, or other supports for staff working with the student.' },
          ]
        },
        // Section 5: LRE and Participation with Nondisabled Peers
        {
          key: 'lre_placement',
          title: 'Least Restrictive Environment and Educational Placement',
          order: 5,
          description: 'Maryland requires documentation of placement decisions and extent of participation with nondisabled peers.',
          fields: [
            { key: 'removal_explanation', type: 'textarea', label: 'Explanation of Removal from General Education', required: true,
              placeholder: 'Explain why the child cannot be educated in general education with supplementary aids and services...',
              description: 'Maryland requires explanation of the extent to which the child will NOT participate with nondisabled children.' },
            { key: 'participation_percentage', type: 'select', label: 'Percentage of Time in General Education', required: true,
              options: ['80% or more (Inside Regular Class)', '40-79% (Resource/Pull-out)', 'Less than 40% (Separate Class)',
                        'Separate School', 'Residential Facility', 'Hospital/Homebound'] },
            { key: 'nonacademic_participation', type: 'textarea', label: 'Participation in Nonacademic and Extracurricular Activities', required: true,
              placeholder: 'Describe participation in lunch, recess, clubs, sports, field trips...',
              description: 'Document opportunities for participation with nondisabled peers in nonacademic activities.' },
            { key: 'placement_justification', type: 'textarea', label: 'Placement Justification', required: true,
              placeholder: 'Provide justification for the placement decision...',
              description: 'Explain why the selected placement is appropriate and why less restrictive placements were not selected.' },
          ]
        },
        // Section 6: State and District Assessments
        {
          key: 'assessments',
          title: 'Participation in State and District Assessments',
          order: 6,
          description: 'Maryland requires documentation of how the student will participate in state assessments (MCAP, MISA) and what accommodations will be provided.',
          fields: [
            { key: 'assessment_participation', type: 'select', label: 'State Assessment Participation', required: true,
              options: ['Standard Administration', 'Standard with Accommodations', 'Alternate Assessment (Alt-MCAP/Alt-MISA)'],
              description: 'Select how the student will participate in Maryland state assessments.' },
            { key: 'alternate_assessment_rationale', type: 'textarea', label: 'Alternate Assessment Rationale', required: false,
              placeholder: 'If alternate assessment is selected, explain why the student cannot participate in regular assessment...',
              description: 'Required only if alternate assessment is selected. Must explain criteria under COMAR.' },
            { key: 'assessment_accommodations', type: 'textarea', label: 'Assessment Accommodations', required: false,
              placeholder: 'List specific accommodations for state and district assessments...',
              description: 'Document approved accommodations from Maryland\'s approved accommodations list.' },
            { key: 'district_assessment_accommodations', type: 'textarea', label: 'District Assessment Accommodations', required: false,
              placeholder: 'List accommodations for district-wide assessments...' },
          ]
        },
        // Section 7: Accommodations - Classroom and Testing
        {
          key: 'accommodations',
          title: 'Accommodations and Modifications',
          order: 7,
          description: 'Document accommodations for classroom instruction and assessments.',
          fields: [
            { key: 'presentation_accommodations', type: 'textarea', label: 'Presentation Accommodations', required: false,
              placeholder: 'Large print, audio, sign language interpreter, etc.',
              description: 'How information is presented to the student.' },
            { key: 'response_accommodations', type: 'textarea', label: 'Response Accommodations', required: false,
              placeholder: 'Scribe, speech-to-text, calculator, etc.',
              description: 'How the student is allowed to respond.' },
            { key: 'setting_accommodations', type: 'textarea', label: 'Setting Accommodations', required: false,
              placeholder: 'Small group, separate room, preferential seating, etc.',
              description: 'Where the student is tested or receives instruction.' },
            { key: 'timing_accommodations', type: 'textarea', label: 'Timing/Scheduling Accommodations', required: false,
              placeholder: 'Extended time, frequent breaks, multiple sessions, etc.',
              description: 'When or for how long the student is tested.' },
          ]
        },
        // Section 8: Transition Planning (Age 14+) - Maryland COMAR 13A.05.01.09D
        {
          key: 'transition',
          title: 'Secondary Transition Planning',
          order: 8,
          description: 'Required starting at age 14 in Maryland. Must include measurable postsecondary goals and transition services at age 16.',
          fields: [
            { key: 'transition_applicable', type: 'boolean', label: 'Transition Planning Applicable', required: true,
              description: 'Is the student age 14 or older, or will turn 14 during this IEP?' },
            { key: 'student_vision', type: 'textarea', label: 'Student Vision for the Future', required: false,
              placeholder: 'Describe the student\'s vision for life after high school...',
              description: 'Document the student\'s preferences, interests, and goals for adult life.' },
            { key: 'transition_assessments', type: 'textarea', label: 'Age-Appropriate Transition Assessments', required: false,
              placeholder: 'List transition assessments completed and summarize results...',
              description: 'Include interest inventories, aptitude tests, career assessments, etc.' },
            { key: 'education_training_goal', type: 'textarea', label: 'Postsecondary Education/Training Goal', required: false,
              placeholder: 'Measurable postsecondary goal for education or training...',
              description: 'Required at age 16. Must be measurable and based on transition assessments.' },
            { key: 'employment_goal', type: 'textarea', label: 'Employment Goal', required: false,
              placeholder: 'Measurable postsecondary goal for employment...',
              description: 'Required at age 16. Must be measurable and based on transition assessments.' },
            { key: 'independent_living_goal', type: 'textarea', label: 'Independent Living Goal', required: false,
              placeholder: 'Measurable postsecondary goal for independent living skills...',
              description: 'Required at age 16 if appropriate. Document if not applicable.' },
            { key: 'course_of_study', type: 'textarea', label: 'Course of Study', required: false,
              placeholder: 'Describe the sequence of courses aligned with postsecondary goals...',
              description: 'Starting at age 14, document courses needed to achieve postsecondary goals.' },
            { key: 'transition_services', type: 'textarea', label: 'Transition Services and Activities', required: false,
              placeholder: 'List instruction, related services, community experiences, employment objectives...',
              description: 'Coordinated set of activities to facilitate movement to post-school activities.' },
            { key: 'agency_involvement', type: 'textarea', label: 'Agency Participation', required: false,
              placeholder: 'List agencies invited or participating (DDA, DORS, etc.)...',
              description: 'Document involvement of adult service agencies.' },
            { key: 'transfer_of_rights', type: 'boolean', label: 'Transfer of Rights Discussed', required: false,
              description: 'Has the student been informed about transfer of rights at age 18? (Required at age 17)' },
          ]
        },
        // Section 9: Extended School Year (ESY) - Maryland COMAR 13A.05.01.08
        {
          key: 'esy',
          title: 'Extended School Year Services',
          order: 9,
          description: 'Maryland requires consideration of ESY based on regression/recoupment, critical life skills, emerging skills, interfering behaviors, severity of disability, and special circumstances.',
          fields: [
            { key: 'esy_eligible', type: 'boolean', label: 'ESY Services Required', required: true,
              description: 'Is the student eligible for Extended School Year services?' },
            { key: 'esy_decision_date', type: 'date', label: 'ESY Decision Date', required: false },
            { key: 'regression_recoupment', type: 'textarea', label: 'Regression/Recoupment Data', required: false,
              placeholder: 'Document evidence of significant regression during breaks and recoupment time...',
              description: 'Does the student show significant regression that cannot be recouped in a reasonable time?' },
            { key: 'critical_life_skills', type: 'textarea', label: 'Critical Life Skills', required: false,
              placeholder: 'Document critical skills at risk without ESY...',
              description: 'Are critical life skills (self-sufficiency, independence) at risk without ESY?' },
            { key: 'emerging_skills', type: 'textarea', label: 'Emerging Skills/Breakthrough Opportunities', required: false,
              placeholder: 'Document emerging skills that may be lost without ESY...',
              description: 'Is the student at a critical point for a breakthrough that would be lost without ESY?' },
            { key: 'interfering_behaviors', type: 'textarea', label: 'Interfering Behaviors', required: false,
              placeholder: 'Document behaviors that may prevent progress...',
              description: 'Are there behaviors that will significantly interfere with learning if ESY is not provided?' },
            { key: 'severity_nature', type: 'textarea', label: 'Nature and Severity of Disability', required: false,
              placeholder: 'Consider the nature and severity of the disability...',
              description: 'Does the nature/severity of the disability warrant ESY services?' },
            { key: 'special_circumstances', type: 'textarea', label: 'Special Circumstances', required: false,
              placeholder: 'Document any special circumstances...',
              description: 'Are there other special circumstances requiring ESY consideration?' },
            { key: 'esy_services_description', type: 'textarea', label: 'ESY Services Description', required: false,
              placeholder: 'If ESY eligible, describe services, goals addressed, duration...',
              description: 'Document specific ESY services if the student is eligible.' },
            { key: 'esy_goals', type: 'textarea', label: 'ESY Goals to Address', required: false,
              placeholder: 'List specific IEP goals to be addressed during ESY...' },
          ]
        },
        // Section 10: IEP Team and Signatures
        {
          key: 'team_signatures',
          title: 'IEP Team Members and Signatures',
          order: 10,
          description: 'Document IEP team participants and their agreement with the plan.',
          fields: [
            { key: 'team_members', type: 'textarea', label: 'IEP Team Members', required: true,
              placeholder: 'List all team members: name, role, and date of participation...',
              description: 'Include parent, general ed teacher, special ed teacher, LEA representative, and others.' },
            { key: 'parent_participation', type: 'textarea', label: 'Parent Participation', required: true,
              placeholder: 'Document parent participation and input...',
              description: 'Maryland requires meaningful parent participation in IEP development.' },
            { key: 'student_participation', type: 'textarea', label: 'Student Participation', required: false,
              placeholder: 'Document student participation and input if applicable...',
              description: 'Students should participate when appropriate, especially for transition planning.' },
            { key: 'consent_for_services', type: 'boolean', label: 'Parent Consent for Services Obtained', required: true,
              description: 'Has the parent provided written consent for initial provision of services?' },
            { key: 'additional_notes', type: 'textarea', label: 'Additional Notes', required: false,
              placeholder: 'Any additional notes or documentation...' },
          ]
        }
      ]
    };

    await prisma.planSchema.upsert({
      where: { id: 'iep-schema-v1' },
      update: {
        fields: iepSchemaFields,
        name: 'Maryland IEP Form - July 2023',
        description: 'Maryland IEP form aligned with July 1, 2023 template and COMAR 13A.05.01.09 requirements',
      },
      create: {
        id: 'iep-schema-v1',
        version: 1,
        name: 'Maryland IEP Form - July 2023',
        description: 'Maryland IEP form aligned with July 1, 2023 template and COMAR 13A.05.01.09 requirements',
        planTypeId: iepPlanType.id,
        effectiveFrom: new Date('2023-07-01'),
        fields: iepSchemaFields,
      },
    });
    console.log('✅ Created Maryland IEP schema with 10 sections (July 2023 template)');
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

  // Seed Form Field Definitions
  await seedFormFieldDefinitions();

  console.log('🎉 Seed completed successfully!');
}

/**
 * Seeds form field definitions from JSON file
 */
async function seedFormFieldDefinitions() {
  console.log('📋 Seeding form field definitions...');

  const seedFilePath = path.join(__dirname, '../seed/iep_field_definitions.seed.json');

  if (!fs.existsSync(seedFilePath)) {
    console.log('⚠️ Field definitions seed file not found, skipping...');
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

  if (!seedData.fields || !Array.isArray(seedData.fields)) {
    console.log('⚠️ Invalid seed data format, skipping...');
    return;
  }

  const formType = seedData.formType as FormType;
  let createdCount = 0;
  let updatedCount = 0;

  for (const field of seedData.fields) {
    // Map control type string to enum
    const controlType = field.controlType as ControlType;
    const optionsEditableBy = (field.optionsEditableBy || 'NONE') as OptionsEditableBy;

    // Upsert the field definition
    const fieldDef = await prisma.formFieldDefinition.upsert({
      where: {
        formType_fieldKey: {
          formType,
          fieldKey: field.fieldKey,
        },
      },
      update: {
        section: field.section,
        sectionOrder: field.sectionOrder || 0,
        fieldLabel: field.fieldLabel,
        controlType,
        isRequired: field.isRequired || false,
        valueEditableBy: field.valueEditableBy || [],
        optionsEditableBy,
        helpText: field.helpText || null,
        placeholder: field.placeholder || null,
        sortOrder: field.sortOrder || 0,
      },
      create: {
        formType,
        section: field.section,
        sectionOrder: field.sectionOrder || 0,
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        controlType,
        isRequired: field.isRequired || false,
        valueEditableBy: field.valueEditableBy || [],
        optionsEditableBy,
        helpText: field.helpText || null,
        placeholder: field.placeholder || null,
        sortOrder: field.sortOrder || 0,
      },
    });

    // Check if this was a create or update
    const existingField = await prisma.formFieldDefinition.findUnique({
      where: { id: fieldDef.id },
      select: { createdAt: true, updatedAt: true },
    });

    if (existingField && existingField.createdAt.getTime() === existingField.updatedAt.getTime()) {
      createdCount++;
    } else {
      updatedCount++;
    }

    // Seed options if provided
    if (field.options && Array.isArray(field.options) && field.options.length > 0) {
      for (const option of field.options) {
        await prisma.formFieldOption.upsert({
          where: {
            fieldDefinitionId_value: {
              fieldDefinitionId: fieldDef.id,
              value: option.value,
            },
          },
          update: {
            label: option.label,
            sortOrder: option.sortOrder || 0,
            isDefault: option.isDefault || false,
          },
          create: {
            fieldDefinitionId: fieldDef.id,
            value: option.value,
            label: option.label,
            sortOrder: option.sortOrder || 0,
            isDefault: option.isDefault || false,
          },
        });
      }
    }
  }

  console.log(`✅ Seeded form field definitions: ${createdCount} created, ${updatedCount} updated`);

  // Seed some sample schools
  await seedSchools();
}

/**
 * Seeds sample schools for the school dropdown
 */
async function seedSchools() {
  console.log('🏫 Seeding schools...');

  const schools = [
    { name: 'Centennial High School', code: 'CHS', stateCode: 'MD' },
    { name: 'Wilde Lake High School', code: 'WLHS', stateCode: 'MD' },
    { name: 'Howard High School', code: 'HHS', stateCode: 'MD' },
    { name: 'Atholton High School', code: 'AHS', stateCode: 'MD' },
    { name: 'Long Reach High School', code: 'LRHS', stateCode: 'MD' },
    { name: 'Oakland Mills High School', code: 'OMHS', stateCode: 'MD' },
    { name: 'Reservoir High School', code: 'RHS', stateCode: 'MD' },
    { name: 'Hammond High School', code: 'HAHS', stateCode: 'MD' },
    { name: 'Glenelg High School', code: 'GHS', stateCode: 'MD' },
    { name: 'River Hill High School', code: 'RHHS', stateCode: 'MD' },
    { name: 'Mt. Hebron High School', code: 'MHHS', stateCode: 'MD' },
    { name: 'Marriotts Ridge High School', code: 'MRHS', stateCode: 'MD' },
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: {
        stateCode_code: {
          stateCode: school.stateCode,
          code: school.code,
        },
      },
      update: {
        name: school.name,
      },
      create: {
        name: school.name,
        code: school.code,
        stateCode: school.stateCode,
      },
    });
  }

  console.log(`✅ Seeded ${schools.length} schools`);
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
