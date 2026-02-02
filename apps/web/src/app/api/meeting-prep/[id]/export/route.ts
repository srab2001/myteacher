import { NextRequest, NextResponse } from 'next/server';
import { MEETING_TYPE_LABELS } from '@/lib/meeting-prep/templates';

interface ExportRequestBody {
  materials: {
    agenda: {
      items: Array<{
        title: string;
        duration: number;
        description: string;
        presenter?: string;
      }>;
      totalDuration: number;
      meetingDate: string;
      meetingType: string;
    };
    questions: string[];
    parentConcernsLetter: string;
    recordsRequestEmail: string;
    followUpEmail: string;
  };
  studentAlias: string;
  format: 'pdf' | 'docx' | 'html';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Fetch meeting prep from database by ID
  // const meetingPrep = await db.meetingPrep.findUnique({ where: { id } });

  return NextResponse.json({
    id,
    message: 'Export endpoint - use POST with materials to generate export',
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ExportRequestBody = await request.json();
    const { materials, studentAlias, format = 'html' } = body;

    if (!materials) {
      return NextResponse.json(
        { error: 'Materials are required for export' },
        { status: 400 }
      );
    }

    // Generate HTML document with all materials
    const htmlContent = generateHtmlDocument(materials, studentAlias);

    if (format === 'html') {
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="meeting-prep-${id}.html"`,
        },
      });
    }

    // For PDF/DOCX, we would integrate with a document generation service
    // For now, return the HTML with instructions
    if (format === 'pdf' || format === 'docx') {
      // TODO: Integrate with a PDF/DOCX generation service like:
      // - Puppeteer for PDF
      // - docx library for Word documents

      return NextResponse.json({
        id,
        format,
        html: htmlContent,
        message: `${format.toUpperCase()} export would be generated here. For now, use the HTML version.`,
        download_url: null, // Would be a signed URL to the generated file
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting meeting prep:', error);
    return NextResponse.json(
      { error: 'Failed to export meeting preparation materials' },
      { status: 500 }
    );
  }
}

function generateHtmlDocument(
  materials: ExportRequestBody['materials'],
  studentAlias: string
): string {
  const meetingTypeLabel =
    MEETING_TYPE_LABELS[materials.agenda.meetingType as keyof typeof MEETING_TYPE_LABELS] ||
    materials.agenda.meetingType;

  const agendaHtml = materials.agenda.items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.title}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.duration} min</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.presenter || '-'}</td>
      </tr>
    `
    )
    .join('');

  const questionsHtml = materials.questions
    .map((q, i) => `<li style="margin-bottom: 8px;">${q}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IEP Meeting Preparation - ${studentAlias}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #1a365d;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 10px;
    }
    h2 {
      color: #2c5282;
      margin-top: 40px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #2c5282;
      color: white;
      padding: 12px 8px;
      text-align: left;
    }
    .letter-section {
      background-color: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      white-space: pre-wrap;
    }
    .page-break {
      page-break-before: always;
      margin-top: 40px;
    }
    .header-info {
      background-color: #edf2f7;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    @media print {
      .page-break {
        page-break-before: always;
      }
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <h1>IEP Meeting Preparation Materials</h1>

  <div class="header-info">
    <strong>Student:</strong> ${studentAlias}<br>
    <strong>Meeting Type:</strong> ${meetingTypeLabel}<br>
    <strong>Meeting Date:</strong> ${materials.agenda.meetingDate}<br>
    <strong>Total Meeting Duration:</strong> ${materials.agenda.totalDuration} minutes
  </div>

  <h2>1. Meeting Agenda</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Topic</th>
        <th>Time</th>
        <th>Description</th>
        <th>Presenter</th>
      </tr>
    </thead>
    <tbody>
      ${agendaHtml}
    </tbody>
  </table>

  <div class="page-break">
    <h2>2. Questions for the IEP Team</h2>
    <p>Use these questions during the meeting to ensure all your concerns are addressed:</p>
    <ol>
      ${questionsHtml}
    </ol>
  </div>

  <div class="page-break">
    <h2>3. Parent Concerns Letter</h2>
    <p><em>Submit this letter before or during the meeting to formally document your concerns:</em></p>
    <div class="letter-section">${materials.parentConcernsLetter}</div>
  </div>

  <div class="page-break">
    <h2>4. Records Request Email</h2>
    <p><em>Send this email before the meeting to request relevant educational records:</em></p>
    <div class="letter-section">${materials.recordsRequestEmail}</div>
  </div>

  <div class="page-break">
    <h2>5. Follow-Up Email Template</h2>
    <p><em>Use this template after the meeting to confirm decisions and action items:</em></p>
    <div class="letter-section">${materials.followUpEmail}</div>
  </div>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
    <p>Generated by Maryland Special Education Tools | ${new Date().toLocaleDateString()}</p>
    <p>This document is for informational purposes and should be reviewed before use.</p>
  </footer>
</body>
</html>`;
}
