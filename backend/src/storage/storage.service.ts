import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: IStorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
  ) {
    const providerType = this.configService.get<string>('STORAGE_PROVIDER', 'local').toLowerCase();
    this.logger.log(`Initializing Storage Service with provider: ${providerType}`);

    if (providerType === 's3') {
      this.provider = this.s3StorageProvider;
    } else {
      this.provider = this.localStorageProvider;
    }
  }

  async uploadFile(key: string, file: Buffer, mimeType: string): Promise<string> {
    return this.provider.uploadFile(key, file, mimeType);
  }

  async deleteFile(key: string): Promise<void> {
    return this.provider.deleteFile(key);
  }

  async getFileUrl(key: string): Promise<string> {
    return this.provider.getFileUrl(key);
  }
}
