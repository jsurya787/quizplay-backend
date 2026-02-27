interface BaseEmailLayoutInput {
  appName: string;
  appLogoUrl?: string;
  title: string;
  greeting?: string;
  intro?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function escapeHtml(value?: string): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderLightEmailLayout(input: BaseEmailLayoutInput): string {
  const appName = escapeHtml(input.appName);
  const title = escapeHtml(input.title);
  const greeting = input.greeting ? `<p style=\"margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#4b5563;\">${escapeHtml(input.greeting)}</p>` : '';
  const intro = input.intro ? `<p style=\"margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#4b5563;\">${escapeHtml(input.intro)}</p>` : '';
  const bodyHtml = input.bodyHtml || '';
  const footerNote = input.footerNote
    ? `<p style=\"margin:0;font-size:13px;line-height:1.6;color:#6b7280;\">${escapeHtml(input.footerNote)}</p>`
    : '';

  const logoBlock = input.appLogoUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
        <tr>
          <td style="text-align:center;">
            <img src=\"${escapeHtml(input.appLogoUrl)}\" alt=\"${appName} Logo\" width="88" style=\"height:auto;max-height:88px;max-width:88px;display:block;border:0;outline:none;text-decoration:none;margin:0 auto;\" />
          </td>
        </tr>
      </table>
      <div style=\"font-size:13px;font-weight:600;color:#2563eb;letter-spacing:0.2px;margin-top:8px;\">${appName}</div>
    `
    : `<div style=\"font-size:24px;font-weight:700;color:#2563eb;\">${appName}</div>`;

  const ctaBlock = input.ctaLabel && input.ctaUrl
    ? `<a href=\"${escapeHtml(input.ctaUrl)}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:8px;\">${escapeHtml(input.ctaLabel)}</a>`
    : '';

  return `
    <div style="margin:0;padding:24px;background:#f6f9fc;font-family:Arial,sans-serif;color:#1f2937;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 8px 28px;text-align:center;background:#f8fbff;">
            ${logoBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 6px 28px;">
            <h2 style="margin:0 0 10px 0;font-size:22px;line-height:1.3;color:#111827;">${title}</h2>
            ${greeting}
            ${intro}
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 18px 28px;">
            ${ctaBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 26px 28px;">
            ${footerNote}
          </td>
        </tr>
      </table>
    </div>
  `;
}
