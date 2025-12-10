// IEP PDF Field Mapping for Maryland MSDE IEP Form
// This maps internal field keys to PDF positions/fields

import { PdfFieldMap, PdfConfig } from './types.js';

// Maryland IEP Form field mappings
// Note: x/y coordinates are in PDF points (1/72 inch from bottom-left)
// These will need adjustment based on actual PDF template

export const iepFieldMaps: PdfFieldMap[] = [
  // Page 1 - Student Information
  { sectionKey: 'student_information', fieldKey: 'student_name', page: 0, x: 100, y: 720, maxWidth: 200, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'date_of_birth', page: 0, x: 350, y: 720, maxWidth: 100, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'grade_level', page: 0, x: 480, y: 720, maxWidth: 50, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'student_id', page: 0, x: 100, y: 695, maxWidth: 150, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'school_name', page: 0, x: 280, y: 695, maxWidth: 200, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'iep_date', page: 0, x: 480, y: 695, maxWidth: 80, fontSize: 10 },

  // Parent/Guardian Information
  { sectionKey: 'student_information', fieldKey: 'parent_name', page: 0, x: 100, y: 670, maxWidth: 200, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'parent_address', page: 0, x: 100, y: 645, maxWidth: 300, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'parent_phone', page: 0, x: 420, y: 645, maxWidth: 120, fontSize: 10 },

  // Disability Category
  { sectionKey: 'student_information', fieldKey: 'primary_disability', page: 0, x: 100, y: 600, maxWidth: 200, fontSize: 10 },
  { sectionKey: 'student_information', fieldKey: 'secondary_disability', page: 0, x: 350, y: 600, maxWidth: 200, fontSize: 10 },

  // Page 2 - Present Levels of Performance
  { sectionKey: 'present_levels', fieldKey: 'academic_performance', page: 1, x: 50, y: 700, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'present_levels', fieldKey: 'functional_performance', page: 1, x: 50, y: 550, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'present_levels', fieldKey: 'parent_concerns', page: 1, x: 50, y: 400, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'present_levels', fieldKey: 'student_strengths', page: 1, x: 50, y: 250, maxWidth: 500, fontSize: 9 },

  // Page 3 - Goals (First goal)
  { sectionKey: 'goals', fieldKey: 'goal_1_area', page: 2, x: 100, y: 720, maxWidth: 150, fontSize: 10 },
  { sectionKey: 'goals', fieldKey: 'goal_1_baseline', page: 2, x: 50, y: 680, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'goals', fieldKey: 'goal_1_annual', page: 2, x: 50, y: 600, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'goals', fieldKey: 'goal_1_objectives', page: 2, x: 50, y: 480, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'goals', fieldKey: 'goal_1_measurement', page: 2, x: 50, y: 380, maxWidth: 500, fontSize: 9 },

  // Page 4 - Services
  { sectionKey: 'services', fieldKey: 'special_education_services', page: 3, x: 50, y: 700, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'services', fieldKey: 'related_services', page: 3, x: 50, y: 550, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'services', fieldKey: 'supplementary_aids', page: 3, x: 50, y: 400, maxWidth: 500, fontSize: 9 },

  // Page 5 - Educational Placement
  { sectionKey: 'placement', fieldKey: 'placement_type', page: 4, x: 100, y: 700, maxWidth: 400, fontSize: 10 },
  { sectionKey: 'placement', fieldKey: 'placement_justification', page: 4, x: 50, y: 650, maxWidth: 500, fontSize: 9 },
  { sectionKey: 'placement', fieldKey: 'lre_percentage', page: 4, x: 100, y: 550, maxWidth: 100, fontSize: 10 },
  { sectionKey: 'placement', fieldKey: 'transportation_needs', page: 4, x: 50, y: 500, maxWidth: 500, fontSize: 9 },

  // Signatures section
  { sectionKey: 'signatures', fieldKey: 'meeting_date', page: 4, x: 100, y: 200, maxWidth: 100, fontSize: 10 },
  { sectionKey: 'signatures', fieldKey: 'next_review_date', page: 4, x: 300, y: 200, maxWidth: 100, fontSize: 10 },
];

export const iepPdfConfig: PdfConfig = {
  templateFileName: 'iep-msde-2025.pdf',
  fieldMaps: iepFieldMaps,
};
