import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncQueue {
  private readonly logger = new Logger(SyncQueue.name);

  constructor(
    @InjectQueue('github-sync') private readonly githubSyncQueue: Queue
  ) {}

  async enqueueRepoImport(repoId: string, orgId: string): Promise<void> {
    this.logger.log(`Enqueuing repo-import job for repoId: ${repoId}, orgId: ${orgId}`);
    
    await this.githubSyncQueue.add(
      'repo-import',
      { repoId, orgId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );
  }
}
