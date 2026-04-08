import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) return;

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    const missing = [
      !cloudName ? 'CLOUDINARY_CLOUD_NAME' : null,
      !apiKey ? 'CLOUDINARY_API_KEY' : null,
      !apiSecret ? 'CLOUDINARY_API_SECRET' : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Cloudinary environment variables are missing: ${missing.join(', ')}`,
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.configured = true;
  }

  getPublicConfig(): { cloudName: string; apiKey: string } {
    this.ensureConfigured();

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')!;
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')!;
    return { cloudName, apiKey };
  }

  createUploadSignature(paramsToSign: Record<string, string | number>) {
    this.ensureConfigured();

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')!;
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    return signature;
  }
}
