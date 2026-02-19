import { escapeHtml, renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface QuizPublishedTemplateInput extends EmailBranding {
  studentName: string;
  teacherName: string;
  quizTitle: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
}

export function buildQuizPublishedForStudentTemplate(
  input: QuizPublishedTemplateInput,
): EmailTemplate {
  const difficultyLabel = input.difficulty
    ? input.difficulty.charAt(0).toUpperCase() + input.difficulty.slice(1).toLowerCase()
    : 'General';

  const subject = `🎉 New Quiz Available: ${input.quizTitle}`;
  const text = `Hi ${input.studentName}, ${input.teacherName} has published a new quiz "${input.quizTitle}" on ${input.appName}.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: 'A New Quiz Is Ready',
    greeting: `Hi ${input.studentName},`,
    intro: `${input.teacherName} has published a new quiz for your class.`,
    bodyHtml: `
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#1e3a8a;">
          <strong>${escapeHtml(input.quizTitle)}</strong>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#1e3a8a;">
          Difficulty: ${escapeHtml(difficultyLabel)}
        </p>
      </div>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#4b5563;">
        Please attempt it at your earliest convenience and track your progress from your dashboard.
      </p>
    `,
    ctaLabel: input.webUrl ? 'Open Quiz Dashboard' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Thanks and regards, Teacher',
  });

  return { subject, text, html };
}
