import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  private configureIfNeeded(): void {
    if (this.isConfigured) return;

    const cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ??
      process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey =
      this.configService.get<string>('CLOUDINARY_API_KEY') ??
      process.env.CLOUDINARY_API_KEY;
    const apiSecret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') ??
      process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.isConfigured = true;
  }

  async uploadImageFromBuffer(opts: {
    buffer: Buffer;
    folder: string;
    originalname?: string;
    mimetype?: string;
  }): Promise<CloudinaryUploadResult> {
    this.configureIfNeeded();

    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: opts.folder,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result?.secure_url || !result.public_id) {
            return reject(
              error ??
                new Error('Cloudinary upload failed (missing result data)'),
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(opts.buffer);
    });
  }
}

