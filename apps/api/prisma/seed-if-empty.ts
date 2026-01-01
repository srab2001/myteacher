import { PrismaClient, SchoolType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if reference data already exists
  const schoolCount = await prisma.school.count();
  const planTypeCount = await prisma.planType.count();
  const jurisdictionCount = await prisma.jurisdiction.count();

  // Determine what needs seeding
  const needsSchools = schoolCount === 0;
  const needsPlanTypes = planTypeCount === 0;
  const needsJurisdictions = jurisdictionCount === 0;

  if (!needsSchools && !needsPlanTypes && !needsJurisdictions) {
    console.log('Reference data already exists, skipping seed.');
    return;
  }

  console.log('Seeding missing data...');
  console.log(`  Schools: ${schoolCount > 0 ? 'exist' : 'MISSING'}`);
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
  // SEED SCHOOLS (Sample for HCPSS)
  // ============================================
  if (needsSchools) {
    console.log('\nSeeding schools (Howard County)...');

    // Find HCPSS jurisdiction
    const hcpss = await prisma.jurisdiction.findFirst({
      where: { districtCode: 'HCPSS' },
    });

    if (!hcpss) {
      console.log('  HCPSS jurisdiction not found, skipping schools');
    } else {
      const hcpssSchools: Array<{ name: string; code: string; schoolType: SchoolType }> = [
        // High Schools
        { name: 'Atholton High School', code: 'AHS', schoolType: 'HIGH' },
        { name: 'Centennial High School', code: 'CHS', schoolType: 'HIGH' },
        { name: 'Howard High School', code: 'HHS', schoolType: 'HIGH' },
        { name: 'Long Reach High School', code: 'LRHS', schoolType: 'HIGH' },
        { name: 'Marriotts Ridge High School', code: 'MRHS', schoolType: 'HIGH' },
        { name: 'Mt. Hebron High School', code: 'MHHS', schoolType: 'HIGH' },
        { name: 'Oakland Mills High School', code: 'OMHS', schoolType: 'HIGH' },
        { name: 'Reservoir High School', code: 'RHS', schoolType: 'HIGH' },
        { name: 'River Hill High School', code: 'RHHS', schoolType: 'HIGH' },
        { name: 'Wilde Lake High School', code: 'WLHS', schoolType: 'HIGH' },
        // Middle Schools
        { name: 'Bonnie Branch Middle School', code: 'BBMS', schoolType: 'MIDDLE' },
        { name: 'Burleigh Manor Middle School', code: 'BMMS', schoolType: 'MIDDLE' },
        { name: 'Clarksville Middle School', code: 'CMS', schoolType: 'MIDDLE' },
        { name: 'Dunloggin Middle School', code: 'DMS', schoolType: 'MIDDLE' },
        // Elementary Schools
        { name: 'Atholton Elementary School', code: 'AES', schoolType: 'ELEMENTARY' },
        { name: 'Bellows Spring Elementary School', code: 'BSES', schoolType: 'ELEMENTARY' },
        { name: 'Bollman Bridge Elementary School', code: 'BBES', schoolType: 'ELEMENTARY' },
        { name: 'Bryant Woods Elementary School', code: 'BWES', schoolType: 'ELEMENTARY' },
      ];

      for (const school of hcpssSchools) {
        await prisma.school.upsert({
          where: {
            jurisdictionId_code: {
              jurisdictionId: hcpss.id,
              code: school.code,
            },
          },
          update: {},
          create: {
            jurisdictionId: hcpss.id,
            code: school.code,
            name: school.name,
            schoolType: school.schoolType,
            isActive: true,
          },
        });
        console.log(`  School: ${school.name}`);
      }
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
