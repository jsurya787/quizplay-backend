import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import dayjs from 'dayjs';
import { Otp, OtpDocument } from './otp.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name)
    private otpModel: Model<OtpDocument>,
  ) {}

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string) {
    const otp = this.generateOtp();
    const expiresAt = dayjs().add(5, 'minute').toDate();

    // Save OTP
    await this.otpModel.create({
      phone,
      otp,
      expiresAt,
    });

    // 🔥 Send SMS via Fast2SMS
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

  async verifyOtp(phone: string, otp: string) {
    const record = await this.otpModel.findOne({
      phone,
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    record.verified = true;
    await record.save();

    return { message: 'OTP verified' };
  }
}
