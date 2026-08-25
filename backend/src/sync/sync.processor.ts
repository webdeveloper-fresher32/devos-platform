import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';

@Processor('github-sync')
@Injectable()
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'repo-import') {
      const { repoId, orgId } = job.data;
      
      const repo = await this.prisma.repository.findUnique({
        where: { id: repoId },
      });

      if (!repo) {
        this.logger.error(`Repository with ID ${repoId} not found. Aborting sync.`);
        return;
      }

      this.logger.log(`Starting sync for repository: ${repo.fullName}`);

      try {
        // 1. Sync Commits
        const commits = await this.githubService.fetchCommits(repo.owner, repo.name);
        for (const commit of commits) {
          await this.prisma.commit.upsert({
            where: { sha: commit.sha },
            update: {
              message: commit.message,
              author: commit.authorName,
              date: new Date(commit.createdAt),
            },
            create: {
              sha: commit.sha,
              message: commit.message,
              author: commit.authorName,
              date: new Date(commit.createdAt),
              repoId: repo.id,
            },
          });
        }

        // 2. Sync Pull Requests
        const prs = await this.githubService.fetchPullRequests(repo.owner, repo.name);
        for (const pr of prs) {
          await this.prisma.pullRequest.upsert({
            where: { githubId: pr.id },
            update: {
              number: pr.number,
              title: pr.title,
              state: pr.state.toUpperCase(),
              author: pr.author,
            },
            create: {
              githubId: pr.id,
              number: pr.number,
              title: pr.title,
              state: pr.state.toUpperCase(),
              author: pr.author,
              url: `https://github.com/${repo.fullName}/pull/${pr.number}`,
              repoId: repo.id,
            },
          });
        }

        // 3. Sync Issues
        const issues = await this.githubService.fetchIssues(repo.owner, repo.name);
        for (const issue of issues) {
          await this.prisma.issue.upsert({
            where: { githubId: issue.id },
            update: {
              number: issue.number,
              title: issue.title,
              state: issue.state.toUpperCase(),
            },
            create: {
              githubId: issue.id,
              number: issue.number,
              title: issue.title,
              state: issue.state.toUpperCase(),
              repoId: repo.id,
            },
          });
        }

        this.logger.log(`Successfully completed synchronization for: ${repo.fullName}`);
      } catch (error) {
        this.logger.error(`Error syncing repository data for ${repo.fullName}`, error);
        throw error;
      }
    }
  }
}
