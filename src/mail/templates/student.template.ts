import { escapeHtml, renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface StudentAddedTemplateInput extends EmailBranding {
  studentName: string;
  teacherName: string;
  teacherEmail?: string;
}

export function buildStudentAddedByTeacherTemplate(input: StudentAddedTemplateInput): EmailTemplate {
  const teacherEmailText = input.teacherEmail || 'Not available';
  const subject = `✨ ${input.appName}: You were added by ${input.teacherName}`;
  const text = `Hi ${input.studentName}, ${input.teacherName} has added you as a student on ${input.appName}. Thanks from Teacher.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: '✨ You have been added as a student',
    greeting: `Hi ${input.studentName},`,
    intro: `${input.teacherName} has added you as a student on ${input.appName}.`,
    bodyHtml: `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#1e3a8a;">You are all set to access teacher-shared quizzes and practice sessions. 🎉</p>
        <p style="margin:0;font-size:14px;color:#1e3a8a;">Teacher email: ${escapeHtml(teacherEmailText)}</p>
      </div>
    `,
    ctaLabel: input.webUrl ? `Open ${input.appName}` : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Thanks from Teacher',
  });

  return { subject, text, html };
}
