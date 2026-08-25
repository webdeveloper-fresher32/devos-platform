import { 
  Controller, 
  Post, 
  Req, 
  Headers, 
  UnauthorizedException, 
  HttpCode, 
  HttpStatus, 
  Logger 
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('github')
  @HttpCode(HttpStatus.OK)
  async handleGithubWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-github-event') event: string
  ) {
    this.logger.log(`Received GitHub Webhook event: ${event}, deliveryId: ${deliveryId}`);

    // 1. Verify Signature
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'super_secret_webhook_key_123';
    
    if (!signature) {
      this.logger.warn('Webhook request rejected: Missing signature header.');
      throw new UnauthorizedException('Missing signature');
    }

    if (!req.rawBody) {
      this.logger.warn('Webhook request rejected: Missing raw body buffer.');
      throw new UnauthorizedException('Missing request payload');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    // Secure timing check
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        this.logger.warn('Webhook signature check failed: Digest mismatch.');
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (e) {
      this.logger.warn('Webhook signature check failed: Hash exception.', e);
      throw new UnauthorizedException('Invalid signature');
    }

    // 2. Idempotency Check
    if (deliveryId) {
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { deliveryId },
      });

      if (existingEvent) {
        this.logger.log(`Webhook delivery ID ${deliveryId} already logged, ignoring duplicate.`);
        return { message: 'Duplicate webhook ignored' };
      }

      // Log event
      await this.prisma.webhookEvent.create({
        data: {
          deliveryId,
          payload: req.body || {},
          status: 'PENDING',
        },
      });
    }

    // 3. Dispatch processing
    try {
      await this.processWebhookEvent(event, req.body, deliveryId);
    } catch (err) {
      this.logger.error(`Error processing webhook event ${event}`, err);
    }

    return { received: true };
  }

  private async processWebhookEvent(event: string, payload: any, deliveryId?: string) {
    const repoId = payload.repository?.id;
    if (!repoId) return;

    // Resolve repository from database
    const dbRepo = await this.prisma.repository.findUnique({
      where: { githubRepoId: repoId },
    });

    if (!dbRepo) {
      this.logger.warn(`Repository with GitHub ID ${repoId} not found in database. Skipping event.`);
      return;
    }

    if (event === 'push') {
      const commits = payload.commits || [];
      for (const commit of commits) {
        await this.prisma.commit.upsert({
          where: { sha: commit.id },
          update: {
            message: commit.message,
            author: commit.author?.name || 'Unknown',
            date: new Date(commit.timestamp),
          },
          create: {
            sha: commit.id,
            message: commit.message,
            author: commit.author?.name || 'Unknown',
            date: new Date(commit.timestamp),
            repoId: dbRepo.id,
          },
        });
      }
    } else if (event === 'pull_request') {
      const pr = payload.pull_request;
      if (pr) {
        const action = payload.action;
        let state = pr.state.toUpperCase();
        if (pr.merged) state = 'MERGED';

        await this.prisma.pullRequest.upsert({
          where: { githubId: pr.id },
          update: {
            title: pr.title,
            state,
            author: pr.user?.login || 'Unknown',
          },
          create: {
            githubId: pr.id,
            number: pr.number,
            title: pr.title,
            state,
            author: pr.user?.login || 'Unknown',
            url: pr.html_url,
            repoId: dbRepo.id,
          },
        });
      }
    } else if (event === 'issues') {
      const issue = payload.issue;
      if (issue) {
        await this.prisma.issue.upsert({
          where: { githubId: issue.id },
          update: {
            title: issue.title,
            state: issue.state.toUpperCase(),
          },
          create: {
            githubId: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state.toUpperCase(),
            repoId: dbRepo.id,
          },
        });
      }
    }

    if (deliveryId) {
      await this.prisma.webhookEvent.update({
        where: { deliveryId },
        data: { status: 'COMPLETED' },
      });
    }
  }
}
