import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  UseGuards, 
  ConflictException, 
  NotFoundException, 
  Logger 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../orgs/guards/roles.guard';
import { Roles } from '../orgs/decorators/roles.decorator';
import { Role, SprintStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('orgs/:orgId/sprints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SprintsController {
  private readonly logger = new Logger(SprintsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async createSprint(
    @Param('orgId') orgId: string,
    @Body() body: { name: string; startDate: string; endDate: string; status?: SprintStatus }
  ) {
    const status = body.status || SprintStatus.PLANNED;

    // Enforce single active sprint restriction
    if (status === SprintStatus.ACTIVE) {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: { orgId, status: SprintStatus.ACTIVE },
      });

      if (activeSprint) {
        throw new ConflictException('An active sprint already exists in this organization workspace.');
      }
    }

    return this.prisma.sprint.create({
      data: {
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status,
        orgId,
      },
    });
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async listSprints(@Param('orgId') orgId: string) {
    return this.prisma.sprint.findMany({
      where: { orgId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateSprint(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; startDate?: string; endDate?: string; status?: SprintStatus }
  ) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, orgId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found in this organization');
    }

    if (body.status === SprintStatus.ACTIVE && sprint.status !== SprintStatus.ACTIVE) {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: { orgId, status: SprintStatus.ACTIVE },
      });

      if (activeSprint) {
        throw new ConflictException('An active sprint already exists in this organization workspace.');
      }
    }

    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.status && { status: body.status }),
      },
    });
  }
}
