import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import dayjs from 'dayjs';
import { Otp, OtpDocument } from './otp.schema';
import { redis } from '../../../redis/redis.provider';
import { buildOtpEmailTemplate } from '../../../mail/templates';
import { EmailSenderService } from '../../../mail/email-sender.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(Otp.name)
    private otpModel: Model<OtpDocument>,
    private readonly emailSender: EmailSenderService,
  ) {
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async checkRateLimit(ip: string): Promise<void> {
    if (!ip) return; // skip if no ip

    const key = `otp:limit:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 86400); // 24 hours
    }

    if (count > 10) {
      this.logger.warn(`OTP rate limit exceeded for IP: ${ip}`);
      throw new BadRequestException('Too many OTP requests from this IP. Please try again after 24 hours.');
    }
  }

  async sendOtp(phone: string, ip?: string) {
    if (ip) await this.checkRateLimit(ip);
    const otp = this.generateOtp();
    const expiresAt = dayjs().add(5, 'minute').toDate();

    await this.otpModel.create({
      phone,
      otp,
      expiresAt,
    });

    await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'otp',
        variables_values: otp,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
        },
      },
    );

    return { message: 'OTP sent successfully' };
  }

  async sendEmailOtp(email: string, ip?: string) {
    if (ip) await this.checkRateLimit(ip);
    const otp = this.generateOtp();
    const expiresAt = dayjs().add(5, 'minute').toDate();

    await this.otpModel.create({
      email,
      otp,
      expiresAt,
    });

    const { appName, appLogoUrl, webUrl } = this.emailSender.getBranding();
    const template = buildOtpEmailTemplate({
      appName,
      appLogoUrl,
      webUrl,
      otp,
      expiresInMinutes: 5,
    });

    const ok = await this.emailSender.sendTemplatedEmail(email, template, appName);
    if (ok) {
      this.logger.log(`OTP sent to ${email}`);
      return { message: 'OTP sent to email successfully' };
    }
    throw new BadRequestException('Failed to send OTP email');
  }

  async verifyOtp(identifier: string, otp: string, type: 'phone' | 'email' = 'phone') {
    const query: any = {
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    };

    if (type === 'email') {
      query.email = identifier.toLowerCase();
    } else {
      query.phone = identifier;
    }

    const record = await this.otpModel.findOne(query);

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    record.verified = true;
    await record.save();

    return { message: 'OTP verified' };
  }
}
