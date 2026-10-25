import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StoreService } from './store.service';

@Global()
@Module({ providers: [PrismaService, StoreService], exports: [PrismaService, StoreService] })
export class CommonModule {}
