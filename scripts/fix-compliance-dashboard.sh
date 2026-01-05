#!/bin/bash
# fix-compliance-dashboard.sh
# Script to apply all fixes for the compliance dashboard errors
# Run from the repository root: ./scripts/fix-compliance-dashboard.sh

set -e

echo "=========================================="
echo "MyTeacher Compliance Dashboard Fix Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to api directory
cd "$(dirname "$0")/../apps/api"

echo -e "\n${YELLOW}Step 1: Checking environment...${NC}"
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi
echo -e "${GREEN}DATABASE_URL is set${NC}"

echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
npm install

echo -e "\n${YELLOW}Step 3: Generating Prisma client...${NC}"
npx prisma@5.22.0 generate
echo -e "${GREEN}Prisma client generated successfully${NC}"

echo -e "\n${YELLOW}Step 4: Running database migrations...${NC}"
npx prisma@5.22.0 migrate deploy
echo -e "${GREEN}Migrations applied successfully${NC}"

echo -e "\n${YELLOW}Step 5: Verifying schema...${NC}"
# Check if key tables exist
npx prisma@5.22.0 db execute --stdin <<EOF
SELECT
    'ReviewSchedule' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ReviewSchedule') as exists
UNION ALL
SELECT
    'ComplianceTask',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ComplianceTask')
UNION ALL
SELECT
    'InAppAlert',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InAppAlert');
EOF

echo -e "\n${YELLOW}Step 6: Checking ComplianceTask schema...${NC}"
npx prisma@5.22.0 db execute --stdin <<EOF
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ComplianceTask'
ORDER BY ordinal_position;
EOF

echo -e "\n${GREEN}=========================================="
echo "Fix script completed successfully!"
echo "==========================================${NC}"

echo -e "\n${YELLOW}Summary of fixes applied:${NC}"
echo "1. Route ordering: /dashboard routes now defined before /:id routes"
echo "2. ComplianceTask: Added createdByUserId field and createdBy relation"
echo "3. InAppAlert: Added relatedEntityType and relatedEntityId fields"
echo "4. Database migrations: All pending migrations applied"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Restart the API server (or trigger a new Vercel deployment)"
echo "2. Test the compliance dashboard at /api/compliance-tasks/dashboard"
echo "3. Test the review dashboard at /api/review-schedules/dashboard"
echo "4. Verify alerts endpoint at /api/alerts"
