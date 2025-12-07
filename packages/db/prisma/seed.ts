import { PrismaClient, PlanTypeCode, UserRole } from '@prisma/client';
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
    await prisma.planSchema.upsert({
      where: { id: 'iep-schema-v1' },
      update: {},
      create: {
        id: 'iep-schema-v1',
        version: 1,
        name: 'IEP Standard Form v1',
        description: 'Standard IEP form for Maryland HCPSS',
        planTypeId: iepPlanType.id,
        effectiveFrom: new Date('2024-01-01'),
        fields: [
          { key: 'present_levels', type: 'textarea', label: 'Present Levels of Performance', required: true },
          { key: 'annual_goals', type: 'goals_list', label: 'Annual Goals', required: true },
          { key: 'services', type: 'services_table', label: 'Special Education Services', required: true },
          { key: 'accommodations', type: 'checkbox_list', label: 'Accommodations', required: false },
          { key: 'participation', type: 'select', label: 'State/District Assessment Participation', required: true },
        ],
      },
    });
    console.log('✅ Created IEP schema');
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
