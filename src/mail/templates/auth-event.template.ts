import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface AuthEventTemplateInput extends EmailBranding {
  firstName?: string;
}

export function buildLoginNotificationEmailTemplate(
  input: AuthEventTemplateInput,
): EmailTemplate {
  const firstName = (input.firstName || 'there').trim();
  const subject = `🔐 ${input.appName}: Login successful`;
  const text = `Hi ${firstName}, you just logged in to your ${input.appName} account. If this was you, you're all set. ✅`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: '🔐 Login successful',
    greeting: `Hi ${firstName}, 👋`,
    intro: `You just logged in to your ${input.appName} account.`,
    bodyHtml: `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#166534;">
          ✅ If this was you, no action is needed. Happy learning!
        </p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'Open Account' : undefined,
    ctaUrl: input.webUrl,
    footerNote: '⚠️ If this was not you, reset your password or contact support immediately.',
  });

  return { subject, text, html };
}

export function buildPasswordChangedEmailTemplate(
  input: AuthEventTemplateInput,
): EmailTemplate {
  const firstName = (input.firstName || 'there').trim();
  const subject = `${input.appName}: Password updated`;
  const text = `Hi ${firstName}, your ${input.appName} password was updated.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: 'Password updated',
    greeting: `Hi ${firstName},`,
    intro: `Your ${input.appName} password was updated successfully.`,
    bodyHtml: `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#92400e;">
          If you did not make this change, contact support immediately.
        </p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'Open Account' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Keep your password private and use a strong unique password.',
  });

  return { subject, text, html };
}
