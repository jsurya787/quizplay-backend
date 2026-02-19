import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface AdminRoleUpdateTemplateInput extends EmailBranding {
  adminName: string;
  targetName: string;
  updatedRole: string;
}

export function buildAdminRoleUpdateTemplate(input: AdminRoleUpdateTemplateInput): EmailTemplate {
  const subject = `${input.appName}: Role update completed`;
  const text = `Hi ${input.adminName}, you updated ${input.targetName} role to ${input.updatedRole}.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: 'Role update completed',
    greeting: `Hi ${input.adminName},`,
    intro: `You successfully updated ${input.targetName} to ${input.updatedRole}.`,
    bodyHtml: `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;">This is an audit confirmation for your recent admin action.</p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'Open Admin Dashboard' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'If you did not perform this action, please review admin access immediately.',
  });

  return { subject, text, html };
}
