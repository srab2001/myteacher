import { PrismaClient } from '@prisma/client';

// Prisma 6.x - standard client
const prisma = new PrismaClient();

async function main() {
  // Check if reference data already exists
  const planTypeCount = await prisma.planType.count();
  const jurisdictionCount = await prisma.jurisdiction.count();

  // Determine what needs seeding
  const needsPlanTypes = planTypeCount === 0;
  const needsJurisdictions = jurisdictionCount === 0;

  if (!needsPlanTypes && !needsJurisdictions) {
    console.log('Reference data already exists, skipping seed.');
    return;
  }

  console.log('Seeding missing data...');
  console.log(`  Jurisdictions: ${jurisdictionCount > 0 ? 'exist' : 'MISSING'}`);
  console.log(`  PlanTypes: ${planTypeCount > 0 ? 'exist' : 'MISSING'}\n`);

  // ============================================
  // SEED JURISDICTIONS
  // ============================================
  if (needsJurisdictions) {
    console.log('Seeding jurisdictions...');

    const jurisdictions = [
      { stateCode: 'MD', stateName: 'Maryland', districtCode: 'HCPSS', districtName: 'Howard County Public School System' },
      { stateCode: 'MD', stateName: 'Maryland', districtCode: 'AACPS', districtName: 'Anne Arundel County Public Schools' },
      { stateCode: 'MD', stateName: 'Maryland', districtCode: 'BCPS', districtName: 'Baltimore County Public Schools' },
      { stateCode: 'MD', stateName: 'Maryland', districtCode: 'MCPS', districtName: 'Montgomery County Public Schools' },
      { stateCode: 'VA', stateName: 'Virginia', districtCode: 'FCPS', districtName: 'Fairfax County Public Schools' },
      { stateCode: 'DC', stateName: 'District of Columbia', districtCode: 'DCPS', districtName: 'DC Public Schools' },
    ];

    for (const jurisdiction of jurisdictions) {
      await prisma.jurisdiction.upsert({
        where: {
          stateCode_districtCode: {
            stateCode: jurisdiction.stateCode,
            districtCode: jurisdiction.districtCode,
          },
        },
        update: {},
        create: jurisdiction,
      });
      console.log(`  Jurisdiction: ${jurisdiction.districtName} (${jurisdiction.stateCode})`);
    }
  }

  // ============================================
  // SEED PLAN TYPES
  // ============================================
  if (needsPlanTypes) {
    console.log('\nSeeding plan types...');

    const planTypes = [
      { code: 'IEP', name: 'Individualized Education Program' },
      { code: 'FIVE_OH_FOUR', name: 'Section 504 Plan' },
      { code: 'BEHAVIOR_PLAN', name: 'Behavior Intervention Plan' },
    ];

    for (const pt of planTypes) {
      await prisma.planType.upsert({
        where: { code: pt.code as 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN' },
        update: {},
        create: {
          code: pt.code as 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN',
          name: pt.name,
        },
      });
      console.log(`  Plan Type: ${pt.name}`);
    }
  }

  // ============================================
  // SEED PLAN SCHEMAS (if needed)
  // ============================================
  const schemaCount = await prisma.planSchema.count();
  if (schemaCount === 0) {
    console.log('\nSeeding plan schemas...');

    const iepPlanType = await prisma.planType.findUnique({ where: { code: 'IEP' } });
    const fiveOhFourPlanType = await prisma.planType.findUnique({ where: { code: 'FIVE_OH_FOUR' } });

    if (iepPlanType) {
      await prisma.planSchema.create({
        data: {
          planTypeId: iepPlanType.id,
          name: 'Maryland IEP Schema',
          version: 1,
          isActive: true,
          fields: {
            sections: [
              {
                name: 'Student Information',
                fields: [
                  { key: 'student_name', label: 'Student Name', type: 'text', required: true },
                  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
                  { key: 'grade_level', label: 'Grade Level', type: 'text', required: true },
                ],
              },
            ],
          },
        },
      });
      console.log('  Schema: Maryland IEP Schema');
    }

    if (fiveOhFourPlanType) {
      await prisma.planSchema.create({
        data: {
          planTypeId: fiveOhFourPlanType.id,
          name: 'Maryland 504 Schema',
          version: 1,
          isActive: true,
          fields: {
            sections: [
              {
                name: 'Student Information',
                fields: [
                  { key: 'student_name', label: 'Student Name', type: 'text', required: true },
                  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
                ],
              },
            ],
          },
        },
      });
      console.log('  Schema: Maryland 504 Schema');
    }
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
