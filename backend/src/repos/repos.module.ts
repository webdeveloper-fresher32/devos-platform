import { Module } from '@nestjs/common';
import { ReposController } from './repos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubModule } from '../github/github.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [PrismaModule, GithubModule, SyncModule],
  controllers: [ReposController],
})
export class ReposModule {}
