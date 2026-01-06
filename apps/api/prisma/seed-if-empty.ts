import { PrismaClient, PlanTypeCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if reference data already exists
  const jurisdictionCount = await prisma.jurisdiction.count();
  const planTypeCount = await prisma.planType.count();

  // Determine what needs seeding
  const needsJurisdictions = jurisdictionCount === 0;
  const needsPlanTypes = planTypeCount === 0;

  if (!needsJurisdictions && !needsPlanTypes) {
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
  // SEED PLAN TYPES (per jurisdiction)
  // ============================================
  if (needsPlanTypes) {
    console.log('\nSeeding plan types...');

    const planTypes: { code: PlanTypeCode; name: string }[] = [
      { code: 'IEP', name: 'Individualized Education Program' },
      { code: 'FIVE_OH_FOUR', name: 'Section 504 Plan' },
      { code: 'BEHAVIOR_PLAN', name: 'Behavior Intervention Plan' },
    ];

    // Get all jurisdictions to create plan types for each
    const jurisdictions = await prisma.jurisdiction.findMany();

    for (const jurisdiction of jurisdictions) {
      for (const pt of planTypes) {
        await prisma.planType.upsert({
          where: {
            jurisdictionId_code: {
              jurisdictionId: jurisdiction.id,
              code: pt.code,
            },
          },
          update: {},
          create: {
            jurisdictionId: jurisdiction.id,
            code: pt.code,
            name: pt.name,
          },
        });
      }
      console.log(`  Plan Types for: ${jurisdiction.districtName}`);
    }
  }

  // ============================================
  // SEED PLAN SCHEMAS (if needed)
  // ============================================
  const schemaCount = await prisma.planSchema.count();
  if (schemaCount === 0) {
    console.log('\nSeeding plan schemas...');

    // Find plan types for HCPSS jurisdiction (sample schemas)
    const hcpss = await prisma.jurisdiction.findFirst({ where: { districtCode: 'HCPSS' } });
    if (!hcpss) {
      console.log('  HCPSS jurisdiction not found, skipping schemas');
    } else {
      const iepPlanType = await prisma.planType.findFirst({ where: { jurisdictionId: hcpss.id, code: 'IEP' } });
      const fiveOhFourPlanType = await prisma.planType.findFirst({ where: { jurisdictionId: hcpss.id, code: 'FIVE_OH_FOUR' } });

      if (iepPlanType) {
        await prisma.planSchema.create({
          data: {
            planTypeId: iepPlanType.id,
            name: 'Maryland IEP Schema',
            version: 1,
            isActive: true,
            effectiveFrom: new Date('2024-01-01'),
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
                {
                  name: 'Present Levels',
                  fields: [
                    { key: 'plaa_academic_performance', label: 'Academic Performance', type: 'textarea', required: false },
                    { key: 'plaa_functional_performance', label: 'Functional Performance', type: 'textarea', required: false },
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
            effectiveFrom: new Date('2024-01-01'),
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
                {
                  name: 'Disability Information',
                  fields: [
                    { key: 'disability_description', label: 'Description of Disability', type: 'textarea', required: true },
                    { key: 'major_life_activities', label: 'Major Life Activities Affected', type: 'textarea', required: true },
                  ],
                },
              ],
            },
          },
        });
        console.log('  Schema: Maryland 504 Schema');
      }
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
