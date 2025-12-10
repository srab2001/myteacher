// PDF Export Service
// Generates filled PDF forms for IEP and 504 plans

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/db.js';
import { iepPdfConfig } from '../pdf-maps/iep.js';
import { pdf504Config } from '../pdf-maps/504.js';
import { PdfFieldMap } from '../pdf-maps/types.js';

// Get __dirname equivalent for ESM modules
const currentFileUrl = new URL(import.meta.url);
const __dirname = path.dirname(currentFileUrl.pathname);

type PlanFieldDict = Record<string, string>;

function fieldKey(sectionKey: string, fieldKey: string): string {
  return `${sectionKey}:${fieldKey}`;
}

// Build a dictionary of all field values for a plan instance
export async function buildPlanFieldDict(planInstanceId: string): Promise<PlanFieldDict> {
  const values = await prisma.planFieldValue.findMany({
    where: { planInstanceId },
  });

  const dict: PlanFieldDict = {};

  for (const v of values) {
    // The fieldKey in DB is just the field key, we need to reconstruct section:field
    // For now, we store without section prefix and match by field key
    const value = v.value as string | number | boolean | null;

    if (value != null) {
      if (typeof value === 'string') {
        dict[v.fieldKey] = value;
      } else if (typeof value === 'number') {
        dict[v.fieldKey] = String(value);
      } else if (typeof value === 'boolean') {
        dict[v.fieldKey] = value ? 'Yes' : 'No';
      } else if (typeof value === 'object') {
        // Handle JSON objects (e.g., dates stored as objects)
        dict[v.fieldKey] = JSON.stringify(value);
      }
    }
  }

  return dict;
}

// Load a PDF template from the pdfs directory
async function loadTemplate(fileName: string): Promise<PDFDocument> {
  const templatePath = path.join(__dirname, '..', '..', 'pdfs', fileName);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    // If no template exists, create a blank PDF
    console.warn(`PDF template not found: ${templatePath}, creating blank document`);
    return PDFDocument.create();
  }

  const templateBytes = fs.readFileSync(templatePath);
  return PDFDocument.load(templateBytes);
}

// Write field values to PDF at specified coordinates
async function writeFieldsToPdf(
  pdfDoc: PDFDocument,
  fieldMaps: PdfFieldMap[],
  dict: PlanFieldDict
): Promise<void> {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const mapping of fieldMaps) {
    // Try to find value by full key or just field key
    const value = dict[fieldKey(mapping.sectionKey, mapping.fieldKey)] || dict[mapping.fieldKey];

    if (!value) continue;

    const pageIndex = mapping.page ?? 0;

    // Ensure page exists (add pages if needed)
    while (pages.length <= pageIndex) {
      pdfDoc.addPage();
    }

    const page = pages[pageIndex];
    const fontSize = mapping.fontSize ?? 10;

    if (mapping.x != null && mapping.y != null) {
      // Handle text wrapping for long content
      const maxWidth = mapping.maxWidth ?? 400;
      const lines = wrapText(value, font, fontSize, maxWidth);

      let yPos = mapping.y;
      for (const line of lines) {
        if (yPos < 50) break; // Stop if we run off the page

        page.drawText(line, {
          x: mapping.x,
          y: yPos,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });

        yPos -= fontSize * 1.2; // Line spacing
      }
    }

    // If PDF has AcroForm fields, handle them here
    if (mapping.pdfFieldName) {
      const form = pdfDoc.getForm();
      try {
        if (mapping.isCheckbox) {
          const checkbox = form.getCheckBox(mapping.pdfFieldName);
          if (value === 'true' || value === 'Yes' || value === mapping.checkValue) {
            checkbox.check();
          }
        } else {
          const textField = form.getTextField(mapping.pdfFieldName);
          textField.setText(value);
        }
      } catch (e) {
        // Field not found in form, skip
        console.warn(`PDF field not found: ${mapping.pdfFieldName}`);
      }
    }
  }
}

// Wrap text to fit within a max width
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// Add student info and plan metadata to the dictionary
async function enrichDictWithPlanInfo(
  planInstanceId: string,
  dict: PlanFieldDict
): Promise<void> {
  const plan = await prisma.planInstance.findUnique({
    where: { id: planInstanceId },
    include: {
      student: true,
      planType: true,
    },
  });

  if (plan) {
    // Add student information
    dict['student_name'] = `${plan.student.firstName} ${plan.student.lastName}`;
    dict['student_first_name'] = plan.student.firstName;
    dict['student_last_name'] = plan.student.lastName;
    dict['date_of_birth'] = plan.student.dateOfBirth?.toISOString().split('T')[0] || '';
    dict['grade_level'] = plan.student.grade || '';
    dict['school_name'] = plan.student.schoolName || '';

    // Add plan dates
    dict['plan_start_date'] = plan.startDate?.toISOString().split('T')[0] || '';
    dict['plan_end_date'] = plan.endDate?.toISOString().split('T')[0] || '';
    dict['iep_date'] = plan.startDate?.toISOString().split('T')[0] || '';
    dict['referral_date'] = plan.startDate?.toISOString().split('T')[0] || '';
  }
}

// Generate IEP PDF for a plan instance
export async function generateIepPdf(planInstanceId: string): Promise<Uint8Array> {
  const dict = await buildPlanFieldDict(planInstanceId);
  await enrichDictWithPlanInfo(planInstanceId, dict);

  let pdfDoc: PDFDocument;

  try {
    pdfDoc = await loadTemplate(iepPdfConfig.templateFileName);
  } catch (error) {
    console.warn('Failed to load IEP template, creating blank document:', error);
    pdfDoc = await PDFDocument.create();

    // Add enough pages for the IEP form
    for (let i = 0; i < 5; i++) {
      pdfDoc.addPage([612, 792]); // Letter size
    }
  }

  await writeFieldsToPdf(pdfDoc, iepPdfConfig.fieldMaps, dict);

  return pdfDoc.save();
}

// Generate 504 PDF for a plan instance
export async function generate504Pdf(planInstanceId: string): Promise<Uint8Array> {
  const dict = await buildPlanFieldDict(planInstanceId);
  await enrichDictWithPlanInfo(planInstanceId, dict);

  let pdfDoc: PDFDocument;

  try {
    pdfDoc = await loadTemplate(pdf504Config.templateFileName);
  } catch (error) {
    console.warn('Failed to load 504 template, creating blank document:', error);
    pdfDoc = await PDFDocument.create();

    // Add enough pages for the 504 form
    for (let i = 0; i < 4; i++) {
      pdfDoc.addPage([612, 792]); // Letter size
    }
  }

  await writeFieldsToPdf(pdfDoc, pdf504Config.fieldMaps, dict);

  return pdfDoc.save();
}

// Get student info for filename generation
export async function getStudentInfoForPlan(planInstanceId: string): Promise<{ lastName: string; firstName: string } | null> {
  const plan = await prisma.planInstance.findUnique({
    where: { id: planInstanceId },
    include: {
      student: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return plan?.student || null;
}
