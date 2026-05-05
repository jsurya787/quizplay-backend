import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import { join } from 'path';
import { Attachment } from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailTemplate } from './templates';
import { isIP } from 'net';
import { promises as dns, setDefaultResultOrder } from 'dns';

@Injectable()
export class EmailSenderService {
  private readonly logoCid = 'quizplay-logo';
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(private readonly configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass =
      this.configService.get<string>('EMAIL_PASS') ||
      this.configService.get<string>('EMAIL_PASS_01');

    setDefaultResultOrder('ipv4first');

    if (!emailUser || !emailPass) {
      this.logger.error('Email credentials are missing. Check EMAIL_USER and EMAIL_PASS.');
    }
  }

  getBranding() {
    const appName = this.configService.get<string>('APP_NAME') || 'QuizPlay';
    const webUrl = this.configService.get<string>('APP_WEB_URL') || '';
    const appLogoUrl = this.resolveEmailLogo().appLogoUrl;
    return { appName, webUrl, appLogoUrl };
  }

  async sendTemplatedEmail(
    to: string,
    template: EmailTemplate,
    appName?: string,
  ): Promise<boolean> {
    const provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'smtp')
      .trim()
      .toLowerCase();

    if (provider === 'resend') {
      return this.sendViaResend(to, template, appName);
    }

    if (provider === 'brevo') {
      return this.sendViaBrevo(to, template, appName);
    }

    const logoConfig = this.resolveEmailLogo();
    const senderName = appName || this.configService.get<string>('APP_NAME') || 'QuizPlay';

    try {
      const { transporter, debug } = await this.createTransporter();
      this.logger.log(
        `Email config: user=${this.maskEmail(debug.emailUser)} passSet=${debug.passSet} host=${debug.smtpHost} port=${debug.smtpPort} secure=${debug.secure} resolvedHost=${debug.resolvedHost} resolvedFamily=${debug.resolvedFamily}`,
      );

      const info = await transporter.sendMail({
        from: `"${senderName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: logoConfig.attachments,
      });
      this.logger.log(`Email accepted for ${to}. messageId=${info.messageId || 'unknown'}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${error?.code || error?.command || error?.message || 'unknown error'}`,
        error?.stack,
      );
      return false;
    }
  }

  private async sendViaResend(
    to: string,
    template: EmailTemplate,
    appName?: string,
  ): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('EMAIL_USER');
    const senderName = appName || this.configService.get<string>('APP_NAME') || 'QuizPlay';

    this.logger.log(
      `Email config: provider=resend from=${this.maskEmail(fromEmail)} apiKeySet=${Boolean(apiKey)}`,
    );

    if (!apiKey || !fromEmail) {
      this.logger.error('Resend email config missing. Check RESEND_API_KEY and EMAIL_FROM.');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderName} <${fromEmail}>`,
          to: [to],
          subject: template.subject,
          text: template.text,
          html: template.html,
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        this.logger.error(
          `Resend failed for ${to}: status=${response.status} body=${this.truncateLog(responseText)}`,
        );
        return false;
      }

      this.logger.log(`Email accepted for ${to} by Resend. response=${this.truncateLog(responseText)}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Resend failed for ${to}: ${error?.code || error?.message || 'unknown error'}`,
        error?.stack,
      );
      return false;
    }
  }

  private async sendViaBrevo(
    to: string,
    template: EmailTemplate,
    appName?: string,
  ): Promise<boolean> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('EMAIL_USER');
    const senderName = appName || this.configService.get<string>('APP_NAME') || 'QuizPlay';

    this.logger.log(
      `Email config: provider=brevo from=${this.maskEmail(fromEmail)} apiKeySet=${Boolean(apiKey)}`,
    );

    if (!apiKey || !fromEmail) {
      this.logger.error('Brevo email config missing. Check BREVO_API_KEY and EMAIL_FROM.');
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: fromEmail,
          },
          to: [{ email: to }],
          subject: template.subject,
          textContent: template.text,
          htmlContent: template.html,
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        this.logger.error(
          `Brevo failed for ${to}: status=${response.status} body=${this.truncateLog(responseText)}`,
        );
        return false;
      }

      this.logger.log(`Email accepted for ${to} by Brevo. response=${this.truncateLog(responseText)}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Brevo failed for ${to}: ${error?.code || error?.message || 'unknown error'}`,
        error?.stack,
      );
      return false;
    }
  }

  private async createTransporter(): Promise<{
    transporter: nodemailer.Transporter;
    debug: {
      emailUser?: string;
      passSet: boolean;
      smtpHost: string;
      smtpPort: number;
      secure: boolean;
      resolvedHost: string;
      resolvedFamily: 4 | 6 | 'unknown';
    };
  }> {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass =
      this.configService.get<string>('EMAIL_PASS') ||
      this.configService.get<string>('EMAIL_PASS_01');
    const smtpHost = this.configService.get<string>('EMAIL_SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = Number(this.configService.get<string>('EMAIL_SMTP_PORT') || 587);
    const secure = smtpPort === 465;
    const resolvedHost = await this.resolveSmtpHostToIpv4(smtpHost);
    const resolvedFamily = isIP(resolvedHost) === 4 ? 4 : 'unknown';

    const smtpOptions: SMTPTransport.Options & { family: 4 } = {
      host: resolvedHost,
      port: smtpPort,
      secure,
      requireTLS: !secure,
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        servername: smtpHost,
      },
    };

    return {
      transporter: nodemailer.createTransport(smtpOptions),
      debug: {
        emailUser,
        passSet: Boolean(emailPass),
        smtpHost,
        smtpPort,
        secure,
        resolvedHost,
        resolvedFamily,
      },
    };
  }

  private async resolveSmtpHostToIpv4(smtpHost: string): Promise<string> {
    if (isIP(smtpHost)) {
      return smtpHost;
    }

    try {
      const addresses = await dns.resolve4(smtpHost);
      if (addresses.length > 0) {
        return addresses[0];
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to resolve IPv4 for SMTP host ${smtpHost}: ${error?.code || error?.message || 'unknown error'}`,
        error?.stack,
      );
    }

    return smtpHost;
  }

  private maskEmail(email?: string): string {
    if (!email) {
      return 'missing';
    }

    const [name, domain] = email.split('@');
    if (!domain) {
      return 'set-invalid-format';
    }

    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
  }

  private truncateLog(value: string, maxLength = 500): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private resolveEmailLogo(): { appLogoUrl: string; attachments: Attachment[] } {
    const uploadsDir = join(process.cwd(), 'uploads');
    const configuredLogoUrl = (this.configService.get<string>('APP_LOGO_URL') || '').trim();
    const isLocalLogoUrl = /localhost|127\.0\.0\.1/i.test(configuredLogoUrl);
    const isHttpsLogoUrl = /^https:\/\//i.test(configuredLogoUrl);

    // Gmail desktop is more reliable with hosted image URLs than SVG CID attachments.
    if (isHttpsLogoUrl) {
      return {
        appLogoUrl: configuredLogoUrl,
        attachments: [],
      };
    }

    const rasterCandidates = ['qp-logo.png', 'qp-logo.jpg', 'qp-logo.jpeg', 'qp-logo.webp'];
    for (const fileName of rasterCandidates) {
      const filePath = join(uploadsDir, fileName);
      if (existsSync(filePath)) {
        const extension = fileName.split('.').pop() || 'png';
        const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
        return {
          appLogoUrl: `cid:${this.logoCid}`,
          attachments: [{
            filename: fileName,
            path: filePath,
            cid: this.logoCid,
            contentType,
          }],
        };
      }
    }

    const svgPath = join(uploadsDir, 'qp-logo.svg');
    if (existsSync(svgPath) && (!configuredLogoUrl || isLocalLogoUrl)) {
      this.logger.warn(
        'Found uploads/qp-logo.svg but Gmail desktop may not render SVG email logos. Use APP_LOGO_URL (https) or add uploads/qp-logo.png.',
      );
    }

    return {
      appLogoUrl: isLocalLogoUrl ? '' : configuredLogoUrl,
      attachments: [],
    };
  }
}
