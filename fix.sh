#!/bin/bash
set -e
cd ~/myteacher
echo "=== Fixing TypeScript errors ==="
perl -i -0pe 's/const where: \{\s*\n\s*planType\?: \{ code: string \};\s*\n\s*jurisdictionId\?: string \| null;\s*\n\s*isActive\?: boolean;\s*\n\s*\} = \{\};/\/\/ eslint-disable-next-line \@typescript-eslint\/no-explicit-any\n    const where: any = {};/gs' apps/api/src/routes/admin.ts
perl -i -pe 's/where\.planType = \{ code: planType \};/where.planType = { is: { code: planType } };/' apps/api/src/routes/admin.ts
perl -i -pe 's/planTypeId: planType\.id,/planType: { connect: { id: planType.id } },/' apps/api/src/routes/admin.ts
perl -i -pe 's/jurisdictionId: data\.jurisdictionId \|\| null,/...(data.jurisdictionId ? { jurisdiction: { connect: { id: data.jurisdictionId } } } : {}),/' apps/api/src/routes/admin.ts
perl -i -pe 's/import \{ AssessmentType \} from/import type { AssessmentType } from/' apps/api/src/routes/iepReports.ts
perl -i -pe 's/assessmentType: data\.assessmentType as AssessmentType,/assessmentType: data.assessmentType as unknown as AssessmentType,/g' apps/api/src/routes/iepReports.ts
perl -i -pe 's/assessmentType: data\.assessmentType as AssessmentType \| undefined,/assessmentType: data.assessmentType as unknown as AssessmentType | undefined,/' apps/api/src/routes/iepReports.ts
perl -i -pe 's/fieldDefinitionId: fieldDef\.id,/fieldDefinition: { connect: { id: fieldDef.id } },/g' apps/api/src/routes/formFields.ts
perl -i -pe 's/fieldDefinitionId: fieldId,/fieldDefinition: { connect: { id: fieldId } },/g' apps/api/src/routes/formFields.ts
perl -i -pe 's/districtId: data\.districtId,$/district: { connect: { id: data.districtId } },/' apps/api/src/routes/formFields.ts
perl -i -pe 's/planInstanceId: planId,/planInstance: { connect: { id: planId } },/' apps/api/src/services/goalWizardService.ts
perl -i -pe 's/const data = await pdfParse\(buffer, options\);/const data = await (pdfParse as any)(buffer, options);/' apps/api/src/services/artifactCompareService.ts
perl -i -pe 's/const data = validateGoalSchema\.parse\(req\.body\);/const data = validateGoalSchema.parse(req.body) as GoalForValidation;/g' apps/api/src/routes/goalWizard.ts
echo "=== Done! Run: git diff ==="
