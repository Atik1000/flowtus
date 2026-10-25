import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { CommonModule } from './common/common.module';
import { RecordsModule } from './records/records.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // Generous global default; sensitive routes (login, track, payments, uploads, order creation) set their own tighter limits.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 240 }]),
    CommonModule,
    AuthModule,
    UploadsModule,
    CatalogueModule,
    RecordsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
