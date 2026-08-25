import { Module } from '@nestjs/common';
import { SprintsController } from './sprints.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SprintsController],
})
export class SprintsModule {}
