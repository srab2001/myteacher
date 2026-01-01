import { prisma } from '../lib/db.js';
import fs from 'fs/promises';
import path from 'path';

// Simple HTML-to-PDF generation using basic template
// In production, consider using puppeteer, pdfkit, or similar library

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanSnapshot = Record<string, any>;

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateHtmlContent(snapshot: PlanSnapshot): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(snapshot.planType.name)} - ${escapeHtml(snapshot.student.firstName)} ${escapeHtml(snapshot.student.lastName)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      margin: 40px;
      color: #333;
    }
    h1 {
      font-size: 24px;
      color: #1a365d;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 18px;
      color: #2c5282;
      border-bottom: 1px solid #cbd5e0;
      padding-bottom: 5px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    h3 {
      font-size: 14px;
      color: #4a5568;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f7fafc;
      border-radius: 5px;
    }
    .info-group {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #718096;
      font-size: 10px;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 12px;
    }
    .goal-box {
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: #fafafa;
    }
    .goal-header {
      font-weight: bold;
      color: #2c5282;
      margin-bottom: 10px;
    }
    .objective {
      margin-left: 20px;
      padding: 5px 0;
      border-left: 2px solid #cbd5e0;
      padding-left: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #edf2f7;
      font-weight: bold;
      font-size: 11px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #718096;
      text-align: center;
    }
    .version-badge {
      display: inline-block;
      background-color: #3182ce;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      margin-left: 10px;
    }
    .section-content {
      padding: 10px 0;
    }
    .empty-message {
      color: #a0aec0;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>
    ${escapeHtml(snapshot.planType.name)}
    <span class="version-badge">Version ${snapshot.versionNumber}</span>
  </h1>

  <div class="header-info">
    <div>
      <div class="info-group">
        <div class="info-label">Student Name</div>
        <div class="info-value">${escapeHtml(snapshot.student.firstName)} ${escapeHtml(snapshot.student.lastName)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Date of Birth</div>
        <div class="info-value">${formatDate(snapshot.student.dateOfBirth)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Grade</div>
        <div class="info-value">${escapeHtml(snapshot.student.grade)}</div>
      </div>
    </div>
    <div>
      <div class="info-group">
        <div class="info-label">School</div>
        <div class="info-value">${escapeHtml(snapshot.student.schoolName)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Plan Period</div>
        <div class="info-value">${formatDate(snapshot.startDate)} - ${formatDate(snapshot.endDate)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Finalized</div>
        <div class="info-value">${formatDate(snapshot.finalizedAt)}</div>
      </div>
    </div>
  </div>

  <h2>Annual Goals</h2>
  ${snapshot.goals.length > 0 ? snapshot.goals.map(goal => `
    <div class="goal-box">
      <div class="goal-header">${escapeHtml(goal.goalCode)} - ${escapeHtml(goal.area)}</div>
      <p>${escapeHtml(goal.annualGoalText)}</p>
      ${goal.targetDate ? `<p><strong>Target Date:</strong> ${formatDate(goal.targetDate)}</p>` : ''}
      ${goal.objectives.length > 0 ? `
        <h3>Short-Term Objectives</h3>
        ${goal.objectives.map(obj => `
          <div class="objective">
            <strong>${obj.sequence}.</strong> ${escapeHtml(obj.objectiveText)}
            ${obj.targetDate ? ` (Target: ${formatDate(obj.targetDate)})` : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>
  `).join('') : '<p class="empty-message">No goals defined</p>'}

  <h2>Special Education and Related Services</h2>
  ${snapshot.services.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Service Type</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Location</th>
          <th>Dates</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.services.map(service => `
          <tr>
            <td>${escapeHtml(service.category)}</td>
            <td>${escapeHtml(service.serviceType)}</td>
            <td>${escapeHtml(service.frequency)}</td>
            <td>${escapeHtml(service.duration)}</td>
            <td>${escapeHtml(service.location)}</td>
            <td>${formatDate(service.startDate)} - ${formatDate(service.endDate)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="empty-message">No services defined</p>'}

  <h2>Accommodations</h2>
  ${snapshot.accommodations.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Location</th>
          <th>Frequency</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.accommodations.map(acc => `
          <tr>
            <td>${escapeHtml(acc.category)}</td>
            <td>${escapeHtml(acc.description)}</td>
            <td>${escapeHtml(acc.location)}</td>
            <td>${escapeHtml(acc.frequency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="empty-message">No accommodations defined</p>'}

  <h2>Assessment Decisions</h2>
  ${snapshot.assessmentDecisions.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Assessment Type</th>
          <th>Participation Type</th>
          <th>Accommodations</th>
          <th>Rationale</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.assessmentDecisions.map(ad => `
          <tr>
            <td>${escapeHtml(ad.assessmentType)}</td>
            <td>${escapeHtml(ad.participationType)}</td>
            <td>${escapeHtml(ad.accommodations) || 'N/A'}</td>
            <td>${escapeHtml(ad.rationale) || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="empty-message">No assessment decisions recorded</p>'}

  ${snapshot.transition ? `
    <h2>Transition Services</h2>
    <div class="section-content">
      ${snapshot.transition.studentVision ? `<p><strong>Student Vision:</strong> ${escapeHtml(snapshot.transition.studentVision)}</p>` : ''}
      ${snapshot.transition.educationTrainingGoal ? `<p><strong>Education/Training Goal:</strong> ${escapeHtml(snapshot.transition.educationTrainingGoal)}</p>` : ''}
      ${snapshot.transition.employmentGoal ? `<p><strong>Employment Goal:</strong> ${escapeHtml(snapshot.transition.employmentGoal)}</p>` : ''}
      ${snapshot.transition.independentLivingGoal ? `<p><strong>Independent Living Goal:</strong> ${escapeHtml(snapshot.transition.independentLivingGoal)}</p>` : ''}
      ${snapshot.transition.courseOfStudy ? `<p><strong>Course of Study:</strong> ${escapeHtml(snapshot.transition.courseOfStudy)}</p>` : ''}
    </div>
  ` : ''}

  ${snapshot.extendedSchoolYear ? `
    <h2>Extended School Year (ESY)</h2>
    <div class="section-content">
      <p><strong>Eligible:</strong> ${snapshot.extendedSchoolYear.isEligible ? 'Yes' : 'No'}</p>
      ${snapshot.extendedSchoolYear.rationale ? `<p><strong>Rationale:</strong> ${escapeHtml(snapshot.extendedSchoolYear.rationale)}</p>` : ''}
      ${snapshot.extendedSchoolYear.servicesDescription ? `<p><strong>Services:</strong> ${escapeHtml(snapshot.extendedSchoolYear.servicesDescription)}</p>` : ''}
    </div>
  ` : ''}

  <div class="footer">
    <p>Document generated on ${formatDate(new Date())} | Version ${snapshot.versionNumber}</p>
    <p>This document is an official record of the ${escapeHtml(snapshot.planType.name)}.</p>
  </div>
</body>
</html>
  `;

  return html;
}

export async function generatePlanPdf(
  versionId: string,
  snapshot: PlanSnapshot,
  userId: string
): Promise<void> {
  try {
    // Generate HTML content
    const htmlContent = generateHtmlContent(snapshot);

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const studentName = `${snapshot.student.lastName}_${snapshot.student.firstName}`.replace(/\s+/g, '_');
    const fileName = `${snapshot.planType.code}_${studentName}_v${snapshot.versionNumber}_${timestamp}.html`;
    const storageKey = `${versionId}/${fileName}`;

    // For now, save as HTML (in production, convert to PDF using puppeteer/pdfkit)
    const versionDir = path.join(exportsDir, versionId);
    await fs.mkdir(versionDir, { recursive: true });

    const filePath = path.join(versionDir, fileName);
    await fs.writeFile(filePath, htmlContent, 'utf-8');

    const stats = await fs.stat(filePath);

    // Create export record
    await prisma.planExport.create({
      data: {
        planVersionId: versionId,
        format: 'HTML', // Using HTML for now, can be PDF with puppeteer
        storageKey: storageKey,
        fileName: fileName.replace('.html', '.pdf'), // User-facing name
        fileSizeBytes: stats.size,
        mimeType: 'text/html', // Would be 'application/pdf' with real PDF
        exportedByUserId: userId,
      },
    });

    console.log(`Generated export for version ${versionId}: ${filePath}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
