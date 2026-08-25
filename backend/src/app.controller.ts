import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { StorageService } from './storage/storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const key = `test-${Date.now()}-${file.originalname}`;
    const url = await this.storageService.uploadFile(key, file.buffer, file.mimetype);
    return {
      message: 'File uploaded successfully',
      key,
      url,
    };
  }
}
