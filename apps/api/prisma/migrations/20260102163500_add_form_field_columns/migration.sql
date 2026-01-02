-- Add missing columns to FormFieldDefinition
ALTER TABLE "FormFieldDefinition" ADD COLUMN IF NOT EXISTS "minLength" INTEGER;
ALTER TABLE "FormFieldDefinition" ADD COLUMN IF NOT EXISTS "maxLength" INTEGER;
