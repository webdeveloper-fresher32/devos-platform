import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncQueue } from './sync.queue';
import { SyncProcessor } from './sync.processor';
import { GithubModule } from '../github/github.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'github-sync',
    }),
    GithubModule,
    PrismaModule,
  ],
  providers: [SyncQueue, SyncProcessor],
  exports: [SyncQueue],
})
export class SyncModule {}
