import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingTemplate } from './entities/accounting-template.entity';
import { AccountingTemplateLine } from './entities/accounting-template-line.entity';
import { PeriodLock } from './entities/period-lock.entity';
import { CostCenter } from './entities/cost-center.entity';
import { CostCenterController } from './controllers/cost-center.controller';
import { PeriodLockController } from './controllers/period-lock.controller';
import { AccountingTemplateController } from './controllers/accounting-template.controller';
import { CostCenterService } from './services/cost-center.service';
import { PeriodLockService } from './services/period-lock.service';
import { AccountingTemplateService } from './services/accounting-template.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingTemplate,
      AccountingTemplateLine,
      PeriodLock,
      CostCenter,
    ]),
    AccountingModule,
  ],
  controllers: [
    CostCenterController,
    PeriodLockController,
    AccountingTemplateController,
  ],
  providers: [CostCenterService, PeriodLockService, AccountingTemplateService],
  exports: [PeriodLockService, AccountingTemplateService],
})
export class AutomationModule {}

