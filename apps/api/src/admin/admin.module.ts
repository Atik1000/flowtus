import { Module } from '@nestjs/common';
import { Cron, CronExpression, ScheduleModule } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CatalogueAdminService } from './catalogue-admin.service';
import { MiscAdminService } from './misc-admin.service';
import { RecordsAdminService } from './records-admin.service';

@Injectable()
class QuoteExpiryJob {
  private log = new Logger('QuoteExpiry');
  constructor(private records: RecordsAdminService) {}
  /** Quotes past their valid-until date become "Quote Expired" and can no longer be approved. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async run() {
    try {
      const n = await this.records.expireStaleQuotes();
      if (n) this.log.log(`Expired ${n} quote(s).`);
    } catch (e) {
      this.log.error(e);
    }
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AdminController],
  providers: [RecordsAdminService, CatalogueAdminService, MiscAdminService, QuoteExpiryJob],
})
export class AdminModule {}
