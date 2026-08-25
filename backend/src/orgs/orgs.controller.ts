import { Controller, Post, Body, Get, UseGuards, Req, Param, Patch, Delete } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { CreateOrgDto, AddMemberDto, UpdateMemberRoleDto } from './dto/orgs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.orgsService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  async findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async addMember(@Param('id') orgId: string, @Body() dto: AddMemberDto) {
    return this.orgsService.addMember(orgId, dto);
  }

  @Patch(':id/members/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async updateMemberRole(
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(orgId, targetUserId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async removeMember(@Param('id') orgId: string, @Param('userId') targetUserId: string) {
    return this.orgsService.removeMember(orgId, targetUserId);
  }
}
