import { Controller, Get, Put, Body } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CompanySettings } from './entities/company-settings.entity';

@Controller('company-settings')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getSettings(): Promise<CompanySettings> {
    return this.configService.getSettings();
  }

  @Put()
  async updateSettings(@Body() data: Partial<CompanySettings>): Promise<CompanySettings> {
    return this.configService.updateSettings(data);
  }
}
