// 504 Plan PDF Field Mapping for HCPSS 504 Referral Form
// This maps internal field keys to PDF positions/fields

import { PdfFieldMap, PdfConfig } from './types.js';

// HCPSS 504 Form field mappings
// Note: x/y coordinates are in PDF points (1/72 inch from bottom-left)
// These will need adjustment based on actual PDF template

export const pdf504FieldMaps: PdfFieldMap[] = [
  // Page 1 - Student Information
  { sectionKey: 'student_information', fieldKey: 'student_name', page: 0, x: 150, y: 720, maxWidth: 250, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'date_of_birth', page: 0, x: 450, y: 720, maxWidth: 100, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'grade_level', page: 0, x: 150, y: 695, maxWidth: 50, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'school_name', page: 0, x: 250, y: 695, maxWidth: 200, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'referral_date', page: 0, x: 480, y: 695, maxWidth: 80, fontSize: 11 },

  // Parent/Guardian Information
  { sectionKey: 'student_information', fieldKey: 'parent_name', page: 0, x: 150, y: 660, maxWidth: 200, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'parent_phone', page: 0, x: 400, y: 660, maxWidth: 150, fontSize: 11 },
  { sectionKey: 'student_information', fieldKey: 'parent_email', page: 0, x: 150, y: 635, maxWidth: 300, fontSize: 11 },

  // Reason for Referral
  { sectionKey: 'referral_information', fieldKey: 'referral_reason', page: 0, x: 50, y: 580, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'referral_information', fieldKey: 'referring_person', page: 0, x: 150, y: 520, maxWidth: 200, fontSize: 11 },
  { sectionKey: 'referral_information', fieldKey: 'referring_role', page: 0, x: 400, y: 520, maxWidth: 150, fontSize: 11 },

  // Student Strengths
  { sectionKey: 'student_profile', fieldKey: 'student_strengths', page: 0, x: 50, y: 470, maxWidth: 500, fontSize: 10 },

  // Page 2 - Disability/Impairment Information
  { sectionKey: 'disability_information', fieldKey: 'impairment_type', page: 1, x: 50, y: 720, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'disability_information', fieldKey: 'impairment_description', page: 1, x: 50, y: 650, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'disability_information', fieldKey: 'major_life_activities', page: 1, x: 50, y: 550, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'disability_information', fieldKey: 'functional_limitations', page: 1, x: 50, y: 450, maxWidth: 500, fontSize: 10 },

  // Educational Impact
  { sectionKey: 'educational_impact', fieldKey: 'academic_impact', page: 1, x: 50, y: 350, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'educational_impact', fieldKey: 'behavioral_impact', page: 1, x: 50, y: 250, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'educational_impact', fieldKey: 'physical_impact', page: 1, x: 50, y: 150, maxWidth: 500, fontSize: 10 },

  // Page 3 - Accommodations
  { sectionKey: 'accommodations', fieldKey: 'classroom_accommodations', page: 2, x: 50, y: 700, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'accommodations', fieldKey: 'testing_accommodations', page: 2, x: 50, y: 550, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'accommodations', fieldKey: 'environmental_accommodations', page: 2, x: 50, y: 400, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'accommodations', fieldKey: 'physical_accommodations', page: 2, x: 50, y: 250, maxWidth: 500, fontSize: 10 },

  // Page 4 - Implementation and Review
  { sectionKey: 'implementation', fieldKey: 'implementation_date', page: 3, x: 150, y: 720, maxWidth: 100, fontSize: 11 },
  { sectionKey: 'implementation', fieldKey: 'review_date', page: 3, x: 350, y: 720, maxWidth: 100, fontSize: 11 },
  { sectionKey: 'implementation', fieldKey: 'responsible_staff', page: 3, x: 50, y: 670, maxWidth: 500, fontSize: 10 },
  { sectionKey: 'implementation', fieldKey: 'monitoring_procedures', page: 3, x: 50, y: 570, maxWidth: 500, fontSize: 10 },

  // Team Members/Signatures
  { sectionKey: 'team_members', fieldKey: 'team_chair', page: 3, x: 100, y: 400, maxWidth: 200, fontSize: 10 },
  { sectionKey: 'team_members', fieldKey: 'parent_signature_date', page: 3, x: 400, y: 400, maxWidth: 100, fontSize: 10 },
  { sectionKey: 'team_members', fieldKey: 'coordinator', page: 3, x: 100, y: 350, maxWidth: 200, fontSize: 10 },
];

export const pdf504Config: PdfConfig = {
  templateFileName: 'hcpss-504-referral.pdf',
  fieldMaps: pdf504FieldMaps,
};
