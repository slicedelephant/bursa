import { Controller, Get } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  stats() {
    return this.campaigns.stats();
  }
}
