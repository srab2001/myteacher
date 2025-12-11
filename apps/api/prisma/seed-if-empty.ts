import { PrismaClient, SchoolType } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  // Check if reference data already exists
  const stateCount = await prisma.state.count();
  const planTypeCount = await prisma.planType.count();

  // Always seed plan types if missing (even if states exist)
  const needsPlanTypes = planTypeCount === 0;
  const needsFullSeed = stateCount === 0;

  if (!needsFullSeed && !needsPlanTypes) {
    console.log('Reference data already exists, skipping seed.');
    return;
  }

  if (needsFullSeed) {
    console.log('No reference data found, running full seed...\n');
  } else if (needsPlanTypes) {
    console.log('Plan types missing, seeding plan types...\n');
  }

  // ============================================
  // SEED STATES (only if full seed needed)
  // ============================================
  if (needsFullSeed) {
  console.log('Seeding states...');

  const states = [
    { code: 'MD', name: 'Maryland' },
    { code: 'VA', name: 'Virginia' },
    { code: 'DC', name: 'District of Columbia' },
  ];

  const stateRecords: Record<string, string> = {};

  for (const state of states) {
    const record = await prisma.state.create({
      data: { code: state.code, name: state.name, isActive: true },
    });
    stateRecords[state.code] = record.id;
    console.log(`  State: ${state.name} (${state.code})`);
  }

  // ============================================
  // SEED DISTRICTS
  // ============================================
  console.log('\nSeeding districts...');

  const districts = [
    // Maryland Districts
    { stateCode: 'MD', code: 'HCPSS', name: 'Howard County Public School System' },
    { stateCode: 'MD', code: 'AACPS', name: 'Anne Arundel County Public Schools' },
    { stateCode: 'MD', code: 'BCPS', name: 'Baltimore County Public Schools' },
    { stateCode: 'MD', code: 'BCPSS', name: 'Baltimore City Public Schools' },
    { stateCode: 'MD', code: 'CCPS', name: 'Carroll County Public Schools' },
    { stateCode: 'MD', code: 'FCPS', name: 'Frederick County Public Schools' },
    { stateCode: 'MD', code: 'MCPS', name: 'Montgomery County Public Schools' },
    { stateCode: 'MD', code: 'PGCPS', name: "Prince George's County Public Schools" },
    { stateCode: 'MD', code: 'HCPS', name: 'Harford County Public Schools' },
    // Virginia Districts
    { stateCode: 'VA', code: 'FCPS', name: 'Fairfax County Public Schools' },
    { stateCode: 'VA', code: 'LCPS', name: 'Loudoun County Public Schools' },
    { stateCode: 'VA', code: 'PWCS', name: 'Prince William County Schools' },
    // DC
    { stateCode: 'DC', code: 'DCPS', name: 'District of Columbia Public Schools' },
  ];

  const districtRecords: Record<string, string> = {};

  for (const district of districts) {
    const stateId = stateRecords[district.stateCode];
    if (!stateId) continue;

    const record = await prisma.district.create({
      data: {
        stateId,
        code: district.code,
        name: district.name,
        isActive: true,
      },
    });
    districtRecords[`${district.stateCode}-${district.code}`] = record.id;
    console.log(`  District: ${district.name} (${district.stateCode})`);
  }

  // ============================================
  // SEED SCHOOLS (Sample for HCPSS)
  // ============================================
  console.log('\nSeeding schools (Howard County)...');

  const hcpssId = districtRecords['MD-HCPSS'];
  if (hcpssId) {
    const hcpssSchools: Array<{ name: string; schoolType: SchoolType }> = [
      // High Schools
      { name: 'Atholton High School', schoolType: 'HIGH' },
      { name: 'Centennial High School', schoolType: 'HIGH' },
      { name: 'Glenelg High School', schoolType: 'HIGH' },
      { name: 'Hammond High School', schoolType: 'HIGH' },
      { name: 'Howard High School', schoolType: 'HIGH' },
      { name: 'Long Reach High School', schoolType: 'HIGH' },
      { name: 'Marriotts Ridge High School', schoolType: 'HIGH' },
      { name: 'Mt. Hebron High School', schoolType: 'HIGH' },
      { name: 'Oakland Mills High School', schoolType: 'HIGH' },
      { name: 'Reservoir High School', schoolType: 'HIGH' },
      { name: 'River Hill High School', schoolType: 'HIGH' },
      { name: 'Wilde Lake High School', schoolType: 'HIGH' },
      // Middle Schools
      { name: 'Bonnie Branch Middle School', schoolType: 'MIDDLE' },
      { name: 'Burleigh Manor Middle School', schoolType: 'MIDDLE' },
      { name: 'Clarksville Middle School', schoolType: 'MIDDLE' },
      { name: 'Dunloggin Middle School', schoolType: 'MIDDLE' },
      { name: 'Elkridge Landing Middle School', schoolType: 'MIDDLE' },
      { name: 'Ellicott Mills Middle School', schoolType: 'MIDDLE' },
      { name: 'Folly Quarter Middle School', schoolType: 'MIDDLE' },
      { name: 'Glenwood Middle School', schoolType: 'MIDDLE' },
      { name: 'Hammond Middle School', schoolType: 'MIDDLE' },
      { name: "Harper's Choice Middle School", schoolType: 'MIDDLE' },
      { name: 'Lake Elkhorn Middle School', schoolType: 'MIDDLE' },
      { name: 'Lime Kiln Middle School', schoolType: 'MIDDLE' },
      { name: 'Mayfield Woods Middle School', schoolType: 'MIDDLE' },
      { name: 'Murray Hill Middle School', schoolType: 'MIDDLE' },
      { name: 'Oakland Mills Middle School', schoolType: 'MIDDLE' },
      { name: 'Patapsco Middle School', schoolType: 'MIDDLE' },
      { name: 'Thomas Viaduct Middle School', schoolType: 'MIDDLE' },
      { name: 'Wilde Lake Middle School', schoolType: 'MIDDLE' },
      // Elementary Schools
      { name: 'Atholton Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Bollman Bridge Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Bryant Woods Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Centennial Lane Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Clarksville Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Clemens Crossing Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Dayton Oaks Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Deep Run Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Elkridge Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Forest Ridge Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Fulton Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Gorman Crossing Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Hammond Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Ilchester Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Jeffers Hill Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Lisbon Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Longfellow Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Manor Woods Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Northfield Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Oakland Mills Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Phelps Luck Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Pointers Run Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Running Brook Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Stevens Forest Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Swansfield Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Talbott Springs Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Thunder Hill Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Triadelphia Ridge Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Veterans Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Waterloo Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'West Friendship Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Wilde Lake Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Worthington Elementary School', schoolType: 'ELEMENTARY' },
    ];

    for (const school of hcpssSchools) {
      await prisma.school.create({
        data: {
          districtId: hcpssId,
          name: school.name,
          schoolType: school.schoolType,
          isActive: true,
        },
      });
    }
    console.log(`  Created ${hcpssSchools.length} Howard County schools`);
  }

  // ============================================
  // SEED JURISDICTIONS (Legacy compatibility)
  // ============================================
  console.log('\nSeeding jurisdictions (legacy)...');

  const marylandDistricts = [
    { districtCode: 'AACPS', districtName: 'Anne Arundel County Public Schools' },
    { districtCode: 'BCPS', districtName: 'Baltimore County Public Schools' },
    { districtCode: 'BCPSS', districtName: 'Baltimore City Public Schools' },
    { districtCode: 'CCPS', districtName: 'Carroll County Public Schools' },
    { districtCode: 'FCPS', districtName: 'Frederick County Public Schools' },
    { districtCode: 'HCPSS', districtName: 'Howard County Public School System' },
    { districtCode: 'MCPS', districtName: 'Montgomery County Public Schools' },
    { districtCode: 'PGCPS', districtName: "Prince George's County Public Schools" },
    { districtCode: 'WCPS', districtName: 'Washington County Public Schools' },
    { districtCode: 'HCPS', districtName: 'Harford County Public Schools' },
  ];

  for (const district of marylandDistricts) {
    await prisma.jurisdiction.upsert({
      where: { id: `md-${district.districtCode.toLowerCase()}` },
      update: {},
      create: {
        id: `md-${district.districtCode.toLowerCase()}`,
        stateCode: 'MD',
        stateName: 'Maryland',
        districtCode: district.districtCode,
        districtName: district.districtName,
      },
    });
  }
  console.log(`  Created ${marylandDistricts.length} Maryland jurisdictions`);
  } // end if (needsFullSeed)

  // ============================================
  // SEED PLAN TYPES AND SCHEMAS (always if missing)
  // ============================================
  console.log('\nSeeding plan types and schemas...');

  // Get all jurisdictions to create plan types for each
  const jurisdictions = await prisma.jurisdiction.findMany();

  for (const jurisdiction of jurisdictions) {
    // Create IEP plan type
    const iepType = await prisma.planType.upsert({
      where: {
        jurisdictionId_code: {
          jurisdictionId: jurisdiction.id,
          code: 'IEP',
        },
      },
      update: {},
      create: {
        jurisdictionId: jurisdiction.id,
        code: 'IEP',
        name: 'Individualized Education Program',
        description: 'IEP for students with disabilities',
      },
    });

    // Create 504 plan type
    const fiveOhFourType = await prisma.planType.upsert({
      where: {
        jurisdictionId_code: {
          jurisdictionId: jurisdiction.id,
          code: 'FIVE_OH_FOUR',
        },
      },
      update: {},
      create: {
        jurisdictionId: jurisdiction.id,
        code: 'FIVE_OH_FOUR',
        name: '504 Plan',
        description: 'Section 504 accommodation plan',
      },
    });

    // Create Behavior plan type
    const behaviorType = await prisma.planType.upsert({
      where: {
        jurisdictionId_code: {
          jurisdictionId: jurisdiction.id,
          code: 'BEHAVIOR_PLAN',
        },
      },
      update: {},
      create: {
        jurisdictionId: jurisdiction.id,
        code: 'BEHAVIOR_PLAN',
        name: 'Behavior Intervention Plan',
        description: 'Behavior support and intervention plan',
      },
    });

    // Create schemas for each plan type
    const iepSchema = {
      sections: [
        {
          key: 'student_info',
          title: 'Student Information',
          fields: [
            { key: 'student_name', label: 'Student Name', type: 'text', required: true },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { key: 'grade_level', label: 'Grade Level', type: 'text', required: true },
          ],
        },
        {
          key: 'present_levels',
          title: 'Present Levels of Performance',
          fields: [
            { key: 'academic_performance', label: 'Academic Performance', type: 'textarea', required: true },
            { key: 'functional_performance', label: 'Functional Performance', type: 'textarea', required: true },
          ],
        },
        {
          key: 'goals',
          title: 'Annual Goals',
          isGoalsSection: true,
          fields: [],
        },
        {
          key: 'services',
          title: 'Special Education Services',
          fields: [
            { key: 'services_table', label: 'Services', type: 'services_table', required: false },
          ],
        },
        {
          key: 'accommodations',
          title: 'Accommodations & Modifications',
          fields: [
            { key: 'accommodations_list', label: 'Accommodations', type: 'textarea', required: false },
            { key: 'modifications_list', label: 'Modifications', type: 'textarea', required: false },
          ],
        },
      ],
    };

    const fiveOhFourSchema = {
      sections: [
        {
          key: 'student_info',
          title: 'Student Information',
          fields: [
            { key: 'student_name', label: 'Student Name', type: 'text', required: true },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { key: 'grade_level', label: 'Grade Level', type: 'text', required: true },
          ],
        },
        {
          key: 'disability',
          title: 'Disability Information',
          fields: [
            { key: 'disability_description', label: 'Nature of Disability', type: 'textarea', required: true },
            { key: 'major_life_activity', label: 'Major Life Activity Affected', type: 'textarea', required: true },
          ],
        },
        {
          key: 'accommodations',
          title: 'Accommodations',
          fields: [
            { key: 'classroom_accommodations', label: 'Classroom Accommodations', type: 'textarea', required: true },
            { key: 'testing_accommodations', label: 'Testing Accommodations', type: 'textarea', required: false },
          ],
        },
      ],
    };

    const behaviorSchema = {
      sections: [
        {
          key: 'student_info',
          title: 'Student Information',
          fields: [
            { key: 'student_name', label: 'Student Name', type: 'text', required: true },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { key: 'grade_level', label: 'Grade Level', type: 'text', required: true },
          ],
        },
        {
          key: 'behavior_summary',
          title: 'Behavior Summary',
          fields: [
            { key: 'target_behaviors', label: 'Target Behaviors', type: 'textarea', required: true },
            { key: 'function_of_behavior', label: 'Function of Behavior', type: 'textarea', required: true },
          ],
        },
        {
          key: 'interventions',
          title: 'Interventions',
          fields: [
            { key: 'prevention_strategies', label: 'Prevention Strategies', type: 'textarea', required: true },
            { key: 'replacement_behaviors', label: 'Replacement Behaviors', type: 'textarea', required: true },
            { key: 'reinforcement_strategies', label: 'Reinforcement Strategies', type: 'textarea', required: false },
          ],
        },
      ],
    };

    // Create IEP schema
    await prisma.planSchema.upsert({
      where: {
        id: `${jurisdiction.id}-iep-v1`,
      },
      update: {},
      create: {
        id: `${jurisdiction.id}-iep-v1`,
        planTypeId: iepType.id,
        jurisdictionId: jurisdiction.id,
        version: 1,
        name: 'IEP Template v1',
        description: 'Standard IEP template',
        fields: iepSchema,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
      },
    });

    // Create 504 schema
    await prisma.planSchema.upsert({
      where: {
        id: `${jurisdiction.id}-504-v1`,
      },
      update: {},
      create: {
        id: `${jurisdiction.id}-504-v1`,
        planTypeId: fiveOhFourType.id,
        jurisdictionId: jurisdiction.id,
        version: 1,
        name: '504 Plan Template v1',
        description: 'Standard 504 Plan template',
        fields: fiveOhFourSchema,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
      },
    });

    // Create Behavior Plan schema
    await prisma.planSchema.upsert({
      where: {
        id: `${jurisdiction.id}-behavior-v1`,
      },
      update: {},
      create: {
        id: `${jurisdiction.id}-behavior-v1`,
        planTypeId: behaviorType.id,
        jurisdictionId: jurisdiction.id,
        version: 1,
        name: 'Behavior Plan Template v1',
        description: 'Standard Behavior Intervention Plan template',
        fields: behaviorSchema,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
      },
    });

    console.log(`  Created plan types and schemas for ${jurisdiction.districtName}`);
  }

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
