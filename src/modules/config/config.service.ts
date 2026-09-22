import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from './entities/company-settings.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(CompanySettings)
    private companySettingsRepository: Repository<CompanySettings>,
  ) {}

  async getSettings(): Promise<CompanySettings> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      settings = this.companySettingsRepository.create({
        companyName: 'Empresa Demo',
        ruc: '0000000000001',
        signatures: [
          { role: 'Presidente', name: 'Hno. Miguel Angel' },
          { role: 'Contador', name: 'Ing. Juan Pérez' },
        ],
        defaultAccounts: {
          payableAccountId: null,
          receivableAccountId: null,
          inventoryAccountId: null,
          salesAccountId: null,
          cogsAccountId: null,
          expenseAccountId: null,
        },
      });
      await this.companySettingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
    let settings = await this.getSettings();
    Object.assign(settings, data);
    return this.companySettingsRepository.save(settings);
  }
}
