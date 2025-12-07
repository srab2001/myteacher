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
      studentIdNum: 'STU-001',
      firstName: 'Alex',
      lastName: 'Johnson',
      dateOfBirth: new Date('2015-03-15'),
      grade: '4',
      schoolName: 'Centennial Elementary',
    },
    {
      studentIdNum: 'STU-002',
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: new Date('2014-07-22'),
      grade: '5',
      schoolName: 'Centennial Elementary',
    },
    {
      studentIdNum: 'STU-003',
      firstName: 'James',
      lastName: 'Williams',
      dateOfBirth: new Date('2013-11-08'),
      grade: '6',
      schoolName: 'Wilde Lake Middle',
    },
  ];

  for (const studentData of sampleStudents) {
    const student = await prisma.student.upsert({
      where: { studentIdNum: studentData.studentIdNum },
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
        where: { studentIdNum: 'STU-001' },
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
                date: progressDates[i],
                quickSelect: progressLevels[i],
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
