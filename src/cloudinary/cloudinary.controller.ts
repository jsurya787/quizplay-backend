import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt/roles.guard';
import { Role } from '../auth/role/roles.enum';
import { Roles } from '../auth/role/roles.decorator';
import { CloudinaryService } from './cloudinary.service';
import { CreateSignatureDto } from './dto/create-signature.dto';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('signature')
  createSignature(@Body() body: CreateSignatureDto) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = body.folder ?? 'subjects';

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = this.cloudinaryService.createUploadSignature(paramsToSign);
    const { cloudName, apiKey } = this.cloudinaryService.getPublicConfig();

    return {
      success: true,
      message: 'Signature created successfully',
      data: {
        timestamp,
        folder,
        signature,
        cloudName,
        apiKey,
      },
    };
  }
}

