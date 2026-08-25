import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  NotFoundException, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../orgs/guards/roles.guard';
import { Roles } from '../orgs/decorators/roles.decorator';
import { Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('orgs/:orgId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async createTask(
    @Param('orgId') orgId: string,
    @Body() body: { 
      title: string; 
      description?: string; 
      status?: TaskStatus; 
      points?: number;
      assigneeId?: string;
      sprintId?: string;
      issueId?: string;
    }
  ) {
    // A task must have a container to associate it with the Org context (either a sprint or a repo issue)
    if (!body.sprintId && !body.issueId) {
      // Find the first planned or active sprint in the org to use as default association
      const defaultSprint = await this.prisma.sprint.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultSprint) {
        throw new BadRequestException('You must create a sprint in this organization before creating tasks.');
      }
      body.sprintId = defaultSprint.id;
    }

    // Verify sprint belongs to org
    if (body.sprintId) {
      const sprint = await this.prisma.sprint.findFirst({
        where: { id: body.sprintId, orgId },
      });
      if (!sprint) {
        throw new NotFoundException('Sprint not found in this organization');
      }
    }

    // Verify issue belongs to a repo in this org
    if (body.issueId) {
      const issue = await this.prisma.issue.findFirst({
        where: { id: body.issueId, repository: { orgId } },
      });
      if (!issue) {
        throw new NotFoundException('GitHub Issue not found in this organization repositories');
      }
    }

    return this.prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status || TaskStatus.BACKLOG,
        points: body.points || null,
        assigneeId: body.assigneeId || null,
        sprintId: body.sprintId || null,
        issueId: body.issueId || null,
      },
    });
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async listTasks(
    @Param('orgId') orgId: string,
    @Query('sprintId') sprintId?: string
  ) {
    if (sprintId) {
      return this.prisma.task.findMany({
        where: {
          sprintId,
          sprint: { orgId },
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          sprint: true,
          issue: true,
        },
      });
    }

    // Fetch all organization tasks (linked via org's sprints or org's repo issues)
    return this.prisma.task.findMany({
      where: {
        OR: [
          { sprint: { orgId } },
          { issue: { repository: { orgId } } },
        ],
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        sprint: true,
        issue: true,
      },
    });
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async updateTask(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      points?: number;
      assigneeId?: string;
      sprintId?: string;
    }
  ) {
    // Verify task exists and belongs to organization
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: [
          { sprint: { orgId } },
          { issue: { repository: { orgId } } },
        ],
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this organization');
    }

    // Handle optional sprint movement
    if (body.sprintId) {
      const sprint = await this.prisma.sprint.findFirst({
        where: { id: body.sprintId, orgId },
      });
      if (!sprint) {
        throw new NotFoundException('Target sprint not found in this organization');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        ...(body.points !== undefined && { points: body.points }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.sprintId !== undefined && { sprintId: body.sprintId }),
      },
    });
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async deleteTask(
    @Param('orgId') orgId: string,
    @Param('id') id: string
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: [
          { sprint: { orgId } },
          { issue: { repository: { orgId } } },
        ],
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this organization');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { success: true };
  }
}
