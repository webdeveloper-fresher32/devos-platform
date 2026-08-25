import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  UseGuards, 
  NotFoundException, 
  ConflictException,
  Logger 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../orgs/guards/roles.guard';
import { Roles } from '../orgs/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { SyncQueue } from '../sync/sync.queue';

@Controller('orgs/:orgId/repos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReposController {
  private readonly logger = new Logger(ReposController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly syncQueue: SyncQueue
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async listImportedRepos(@Param('orgId') orgId: string) {
    return this.prisma.repository.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { commits: true, pullRequests: true, issues: true }
        }
      }
    });
  }

  @Get('github-list')
  @Roles(Role.OWNER, Role.ADMIN)
  async listGithubRepos() {
    // List available repositories from GitHub
    return this.githubService.fetchUserRepos();
  }

  @Post('import')
  @Roles(Role.OWNER, Role.ADMIN)
  async importRepository(
    @Param('orgId') orgId: string,
    @Body() body: { name: string; githubRepoId: number; fullName: string; owner: string }
  ) {
    // Check if repository already imported in DevOS
    const existingRepo = await this.prisma.repository.findUnique({
      where: { githubRepoId: body.githubRepoId },
    });

    if (existingRepo) {
      throw new ConflictException('This repository has already been imported.');
    }

    // Save repository in DB
    const repo = await this.prisma.repository.create({
      data: {
        name: body.name,
        githubRepoId: body.githubRepoId,
        fullName: body.fullName,
        owner: body.owner,
        orgId,
      },
    });

    this.logger.log(`Created repository record ${repo.fullName} (ID: ${repo.id}). Dispatching sync task...`);

    // Dispatch background BullMQ sync task
    try {
      await this.syncQueue.enqueueRepoImport(repo.id, orgId);
    } catch (err) {
      this.logger.error(`Failed to enqueue background sync job for repository ${repo.fullName}`, err);
    }

    return repo;
  }
}
