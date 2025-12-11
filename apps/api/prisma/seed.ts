import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding jurisdictions...');

  // Maryland school districts
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
    console.log(`  Created/updated: ${district.districtName}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
