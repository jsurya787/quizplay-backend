import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { existsSync } from 'fs';
import { join } from 'path';
import { Attachment } from 'nodemailer/lib/mailer';
import { EmailTemplate } from './templates';

@Injectable()
export class EmailSenderService {
  private readonly logoCid = 'quizplay-logo';
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
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
      await this.transporter.sendMail({
        from: `"${senderName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: logoConfig.attachments,
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}`, error?.stack);
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
