import { ConflictException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly githubService: GithubService,
  ) {}

  async validateGithubUser(details: {
    githubId: string;
    email: string;
    name: string;
    avatarUrl: string;
    accessToken: string;
  }) {
    // Check if user already exists by GitHub ID
    let user = await this.prisma.user.findUnique({
      where: { githubId: details.githubId },
    });

    if (!user) {
      // Check if user exists with the same email
      user = await this.prisma.user.findUnique({
        where: { email: details.email },
      });

      if (user) {
        // Link GitHub account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: details.githubId,
            avatarUrl: details.avatarUrl || user.avatarUrl,
          },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: details.email,
            githubId: details.githubId,
            name: details.name,
            avatarUrl: details.avatarUrl,
          },
        });
      }
    }

    // Dynamic Organization Auto-Sync from GitHub
    try {
      this.logger.log(`Synchronizing GitHub organizations for user: ${details.email}`);
      const profile = await this.githubService.fetchUserProfile(details.accessToken);
      const personalOrgName = profile.login;

      const githubOrgs = await this.githubService.fetchUserOrgs(details.accessToken);

      const orgsToSync = [
        { login: personalOrgName, name: `${personalOrgName}'s Workspace` },
        ...githubOrgs.map(org => ({ login: org.login, name: org.login })),
      ];

      for (const item of orgsToSync) {
        const slug = item.login.toLowerCase();

        // Upsert Organization
        let org = await this.prisma.organization.findUnique({
          where: { slug },
        });

        if (!org) {
          org = await this.prisma.organization.create({
            data: {
              name: item.name,
              slug,
            },
          });
        }

        // Upsert Membership
        const existingMembership = await this.prisma.membership.findFirst({
          where: {
            userId: user.id,
            orgId: org.id,
          },
        });

        if (!existingMembership) {
          await this.prisma.membership.create({
            data: {
              userId: user.id,
              orgId: org.id,
              role: 'OWNER',
            },
          });
        }
      }
    } catch (err) {
      this.logger.error('Failed to sync organizations from GitHub during auth callback', err);
    }

    return user;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    // Strip password from returned user object
    const { password, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    // Access token valid for 1 hour, refresh token valid for 7 days
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
    });
    
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
