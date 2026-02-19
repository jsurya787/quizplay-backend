import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface OtpTemplateInput extends EmailBranding {
  otp: string;
  expiresInMinutes: number;
}

export function buildOtpEmailTemplate(input: OtpTemplateInput): EmailTemplate {
  const subject = `${input.appName}: Your verification code`;
  const text = `Your OTP is ${input.otp}. It expires in ${input.expiresInMinutes} minutes.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: 'Verify your account',
    greeting: 'Hi there,',
    intro: `Use this one-time password to continue. It expires in ${input.expiresInMinutes} minutes.`,
    bodyHtml: `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#1e3a8a;">Your OTP code</p>
        <p style="margin:0;font-size:30px;letter-spacing:6px;font-weight:800;color:#1d4ed8;">${input.otp}</p>
      </div>
    `,
    ctaLabel: input.webUrl ? `Open ${input.appName}` : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'If you did not request this code, you can ignore this email.',
  });

  return { subject, text, html };
}
