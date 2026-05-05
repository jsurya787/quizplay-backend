import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import { join } from 'path';
import { Attachment } from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailTemplate } from './templates';
import { lookup as dnsLookup, setDefaultResultOrder } from 'dns';

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string,
  family: number,
) => void;

@Injectable()
export class EmailSenderService {
  private readonly logoCid = 'quizplay-logo';
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const smtpHost = this.configService.get<string>('EMAIL_SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = Number(this.configService.get<string>('EMAIL_SMTP_PORT') || 587);

    setDefaultResultOrder('ipv4first');

    const smtpOptions: SMTPTransport.Options & {
      family: 4;
      lookup: (hostname: string, options: unknown, callback: LookupCallback) => void;
    } = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465,
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
      lookup: (_hostname, _options, callback) => {
        dnsLookup(smtpHost, { family: 4 }, callback);
      },
    };

    this.transporter = nodemailer.createTransport(smtpOptions);

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
    const logoConfig = this.resolveEmailLogo();
    const senderName = appName || this.configService.get<string>('APP_NAME') || 'QuizPlay';

    try {
      const info = await this.transporter.sendMail({
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
