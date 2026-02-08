import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import dayjs from 'dayjs';
import * as nodemailer from 'nodemailer';
import { Otp, OtpDocument } from './otp.schema';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Otp.name)
    private otpModel: Model<OtpDocument>,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string) {
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

  async sendEmailOtp(email: string) {
    const otp = this.generateOtp();
    const expiresAt = dayjs().add(5, 'minute').toDate();

    await this.otpModel.create({
      email,
      otp,
      expiresAt,
    });

    const mailOptions = {
      from: `"QuizPlay" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your QuizPlay Verification Code',
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #4CAF50;">QuizPlay Verification</h2>
          <p>Your OTP for signup/login is:</p>
          <h1 style="background: #f4f4f4; padding: 10px; display: inline-block;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent to ${email}`);
      return { message: 'OTP sent to email successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}`, error?.stack);
      throw new BadRequestException('Failed to send OTP email');
    }
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
