import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider } from './storage.interface';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME', 'devos-bucket');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
    } else {
      this.logger.warn('AWS Credentials are not fully configured. S3 operations will fail.');
      // Create a fallback client so it does not crash on startup
      this.s3Client = new S3Client({ region });
      this.isConfigured = false;
    }
  }

  async uploadFile(key: string, file: Buffer, mimeType: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('S3 Storage Provider is not configured. Missing credentials.');
    }
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });
    await this.s3Client.send(command);
    return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION', 'us-east-1')}.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('S3 Storage Provider is not configured. Skipping file delete.');
      return;
    }
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async getFileUrl(key: string): Promise<string> {
    if (!this.isConfigured) {
      return `/uploads/${key}`; // Fallback to local routing
    }
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    // Return a presigned URL valid for 1 hour (3600 seconds)
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
