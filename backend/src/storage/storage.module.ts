import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

@Module({
  imports: [ConfigModule],
  providers: [LocalStorageProvider, S3StorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
