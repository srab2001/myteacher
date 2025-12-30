/**
 * PDF Generator for MyTeacher User Guide
 *
 * Generates a comprehensive PDF user guide for new users.
 */

import PDFDocument from 'pdfkit';

const APP_NAME = 'MyTeacher';
const PRIMARY_COLOR = '#4F46E5'; // Indigo

interface Section {
  title: string;
  content: string[];
}

const USER_GUIDE_SECTIONS: Section[] = [
  {
    title: 'Welcome to MyTeacher',
    content: [
      'MyTeacher is a comprehensive special education management platform designed to streamline IEP, 504, and Behavior Intervention Plan workflows.',
      '',
      'This guide will help you get started with all the features available to you.',
    ],
  },
  {
    title: 'Getting Started',
    content: [
      '1. Log in with your email and temporary password',
      '2. You will be prompted to create a new password',
      '3. Complete your profile setup (role, school, district)',
      '4. You are now ready to use MyTeacher!',
      '',
      'If you have any issues logging in, contact your administrator.',
    ],
  },
  {
    title: 'Dashboard Overview',
    content: [
      'Your dashboard shows:',
      '- Quick access to your students',
      '- Recent activity and updates',
      '- Upcoming deadlines and tasks',
      '- Status indicators for each student',
      '',
      'Use the navigation menu to access different sections.',
    ],
  },
  {
    title: 'Managing Students',
    content: [
      'To add a new student:',
      '1. Click "Add Student" from the dashboard',
      '2. Enter student information',
      '3. Assign to appropriate plan type (IEP, 504, BIP)',
      '',
      'To view student details:',
      '- Click on any student card',
      '- View their plans, goals, and progress',
    ],
  },
  {
    title: 'IEP Management',
    content: [
      'Creating and managing Individualized Education Programs:',
      '',
      '1. Navigate to student profile',
      '2. Select "New IEP" or edit existing',
      '3. Complete required sections:',
      '   - Present levels of performance',
      '   - Annual goals and objectives',
      '   - Services and accommodations',
      '   - Progress monitoring schedule',
      '',
      'Use the Goal Wizard for AI-assisted goal writing.',
    ],
  },
  {
    title: '504 Plans',
    content: [
      'Managing Section 504 Plans:',
      '',
      '1. Access through student profile',
      '2. Document disability and major life activities',
      '3. Add accommodations and modifications',
      '4. Set review dates',
      '',
      'All changes are tracked for compliance.',
    ],
  },
  {
    title: 'Behavior Intervention Plans',
    content: [
      'For students requiring behavior support:',
      '',
      '1. Define target behaviors clearly',
      '2. Set measurement methods (frequency, duration, etc.)',
      '3. Record behavior events as they occur',
      '4. Track progress over time',
      '',
      'Use the quick-entry buttons for fast data collection.',
    ],
  },
  {
    title: 'Progress Monitoring',
    content: [
      'Track student progress effectively:',
      '',
      '- Quick progress buttons for rapid entry',
      '- Detailed notes with voice dictation',
      '- Work sample uploads with ratings',
      '- Service delivery logging',
      '',
      'All data is securely stored and accessible for reporting.',
    ],
  },
  {
    title: 'Reports and Printing',
    content: [
      'Generate professional reports:',
      '',
      '1. Navigate to Reports section',
      '2. Select report type',
      '3. Choose date range',
      '4. Export as PDF',
      '',
      'Reports include progress data and goal summaries.',
    ],
  },
  {
    title: 'Getting Help',
    content: [
      'Need assistance?',
      '',
      '- Contact your school administrator',
      '- Email support: support@myteacher.app',
      '- Check the Help section in the app',
      '',
      'For technical issues, please provide:',
      '- Your username',
      '- Description of the issue',
      '- Any error messages',
    ],
  },
];

/**
 * Generate a PDF user guide
 * @returns Buffer containing the PDF
 */
export async function generateUserGuidePDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: `${APP_NAME} User Guide`,
          Author: APP_NAME,
          Subject: 'User Guide',
          Keywords: 'myteacher, iep, 504, special education, user guide',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title Page
      doc.fontSize(36).fillColor(PRIMARY_COLOR).text(APP_NAME, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(24).fillColor('#374151').text('User Guide', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).fillColor('#6B7280').text('Special Education Management Platform', { align: 'center' });
      doc.moveDown(4);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      // Table of Contents
      doc.addPage();
      doc.fontSize(24).fillColor(PRIMARY_COLOR).text('Table of Contents', { align: 'left' });
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#374151');

      USER_GUIDE_SECTIONS.forEach((section, index) => {
        doc.text(`${index + 1}. ${section.title}`, { continued: false });
        doc.moveDown(0.3);
      });

      // Content Sections
      USER_GUIDE_SECTIONS.forEach((section, index) => {
        doc.addPage();

        // Section header
        doc.fontSize(20).fillColor(PRIMARY_COLOR).text(`${index + 1}. ${section.title}`);
        doc.moveDown(1);

        // Section content
        doc.fontSize(11).fillColor('#374151');
        section.content.forEach((line) => {
          if (line === '') {
            doc.moveDown(0.5);
          } else {
            doc.text(line, { lineGap: 4 });
          }
        });

        // Add page number
        doc.fontSize(10).fillColor('#9CA3AF');
        const pageNum = doc.bufferedPageRange().start + doc.bufferedPageRange().count;
        doc.text(`Page ${pageNum}`, 72, doc.page.height - 50, { align: 'center', width: doc.page.width - 144 });
      });

      // Footer page
      doc.addPage();
      doc.fontSize(16).fillColor(PRIMARY_COLOR).text('Thank You for Using MyTeacher', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(12).fillColor('#374151');
      doc.text('This guide covers the essential features to get you started.', { align: 'center' });
      doc.moveDown(1);
      doc.text('For additional help, contact your administrator or visit our support resources.', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#6B7280');
      doc.text(`${APP_NAME} - Empowering Special Education`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
