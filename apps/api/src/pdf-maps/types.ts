// PDF Field Mapping Types

export type PdfFieldMap = {
  sectionKey: string;
  fieldKey: string;
  // If the PDF has named AcroForm fields:
  pdfFieldName?: string;
  // If the PDF is flat (coordinate-based):
  page?: number;
  x?: number;
  y?: number;
  maxWidth?: number;
  fontSize?: number;
  // For checkbox fields
  isCheckbox?: boolean;
  checkValue?: string;
};

export type PdfConfig = {
  templateFileName: string;
  fieldMaps: PdfFieldMap[];
};
