import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface TeacherPromotionTemplateInput extends EmailBranding {
  teacherName: string;
  adminName: string;
}

export function buildTeacherPromotionTemplate(input: TeacherPromotionTemplateInput): EmailTemplate {
  const subject = `🎉 ${input.appName}: You have been promoted to Teacher`;
  const text = `Hi ${input.teacherName}, congratulations. ${input.adminName} has promoted your account to Teacher on ${input.appName}. Thanks and regards from Admin.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: '🎉 You are now a Teacher',
    greeting: `Hi ${input.teacherName},`,
    intro: `${input.adminName} has promoted your account to Teacher on ${input.appName}.`,
    bodyHtml: `
      <div style="background:#ecfdf3;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:14px;color:#166534;">
          Congratulations on your promotion. You can now create quizzes, manage students, and track submissions. 🎊
        </p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'Go to Dashboard' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Thanks and regards, Admin',
  });

  return { subject, text, html };
}
