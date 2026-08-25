import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto, AddMemberDto, UpdateMemberRoleDto } from './dto/orgs.dto';
import { Role } from '@prisma/client';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrgDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization slug is already taken');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      // Assign creator as OWNER
      await tx.membership.create({
        data: {
          userId,
          orgId: org.id,
          role: Role.OWNER,
        },
      });

      return org;
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async addMember(orgId: string, dto: AddMemberDto) {
    // Find target user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User with this email was not found');
    }

    // Check if membership already exists
    const existingMember = await this.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.prisma.membership.create({
      data: {
        userId: user.id,
        orgId,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateMemberRole(orgId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.membership.update({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
      data: {
        role: dto.role,
      },
    });
  }

  async removeMember(orgId: string, targetUserId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.role === Role.OWNER) {
      throw new ConflictException('Cannot remove the OWNER of the organization. Transfer ownership first.');
    }

    await this.prisma.membership.delete({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }
}
