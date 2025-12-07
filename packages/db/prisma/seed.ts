import { PrismaClient, PlanTypeCode } from '@prisma/client';

const prisma = new PrismaClient();

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
