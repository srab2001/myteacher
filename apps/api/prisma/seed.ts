import { PrismaClient } from '@prisma/client';

// Prisma 6.x - standard client
const prisma = new PrismaClient();

// Import SchoolType enum
const SchoolType = {
  ELEMENTARY: 'ELEMENTARY',
  MIDDLE: 'MIDDLE',
  HIGH: 'HIGH',
  K8: 'K8',
  K12: 'K12',
  OTHER: 'OTHER',
} as const;
type SchoolType = (typeof SchoolType)[keyof typeof SchoolType];

async function main() {
  console.log('Seeding reference data...\n');

  // ============================================
  // SEED JURISDICTIONS (Legacy)
  // ============================================
  console.log('Seeding jurisdictions...');

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
      where: {
        id: `md-${district.districtCode.toLowerCase()}`,
      },
      update: {
        stateName: 'Maryland',
        districtName: district.districtName,
      },
      create: {
        id: `md-${district.districtCode.toLowerCase()}`,
        stateCode: 'MD',
        stateName: 'Maryland',
        districtCode: district.districtCode,
        districtName: district.districtName,
      },
    });
    console.log(`  Jurisdiction: ${district.districtName}`);
  }

  // ============================================
  // SEED STATES
  // ============================================
  console.log('\nSeeding states...');

  const states = [
    { code: 'MD', name: 'Maryland' },
    { code: 'VA', name: 'Virginia' },
    { code: 'DC', name: 'District of Columbia' },
  ];

  const stateRecords: Record<string, string> = {};

  for (const state of states) {
    const record = await prisma.state.upsert({
      where: { code: state.code },
      update: { name: state.name },
      create: { code: state.code, name: state.name, isActive: true },
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

    const record = await prisma.district.upsert({
      where: {
        stateId_code: { stateId, code: district.code },
      },
      update: { name: district.name },
      create: {
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
  console.log('\nSeeding schools (Howard County sample)...');

  const hcpssId = districtRecords['MD-HCPSS'];
  if (hcpssId) {
    const hcpssSchools: Array<{ name: string; schoolType: SchoolType }> = [
      // High Schools
      { name: 'Atholton High School', schoolType: 'HIGH' },
      { name: 'Centennial High School', schoolType: 'HIGH' },
      { name: 'Howard High School', schoolType: 'HIGH' },
      { name: 'Long Reach High School', schoolType: 'HIGH' },
      { name: 'Marriotts Ridge High School', schoolType: 'HIGH' },
      // Middle Schools
      { name: 'Bonnie Branch Middle School', schoolType: 'MIDDLE' },
      { name: 'Burleigh Manor Middle School', schoolType: 'MIDDLE' },
      { name: 'Clarksville Middle School', schoolType: 'MIDDLE' },
      // Elementary Schools
      { name: 'Atholton Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Bollman Bridge Elementary School', schoolType: 'ELEMENTARY' },
      { name: 'Bryant Woods Elementary School', schoolType: 'ELEMENTARY' },
    ];

    for (const school of hcpssSchools) {
      await prisma.school.upsert({
        where: {
          districtId_name: { districtId: hcpssId, name: school.name },
        },
        update: {},
        create: {
          districtId: hcpssId,
          name: school.name,
          isActive: true,
        },
      });
    }
    console.log(`  Created ${hcpssSchools.length} Howard County schools`);
  }

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
