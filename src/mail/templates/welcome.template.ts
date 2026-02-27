import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface WelcomeTemplateInput extends EmailBranding {
  firstName?: string;
}

export function buildWelcomeEmailTemplate(input: WelcomeTemplateInput): EmailTemplate {
  const firstName = (input.firstName || 'there').trim();
  const subject = `Welcome to ${input.appName}`;
  const text = `Welcome to ${input.appName}! You can now test your exams and start practicing quizzes.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: `Welcome to ${input.appName}`,
    greeting: `Hi ${firstName},`,
    intro: 'Your account is ready. Start testing your exam skills with quizzes built for practice.',
    bodyHtml: `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#1e3a8a;">
          You can now explore subjects, attempt quizzes, and track your progress in one place.
        </p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'Start Practicing' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Need help? Reply to this email and our team will assist you.',
  });

  return { subject, text, html };
}
