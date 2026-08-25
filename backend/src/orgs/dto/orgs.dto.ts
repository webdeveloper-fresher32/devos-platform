import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;
}

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  role: Role;
}
