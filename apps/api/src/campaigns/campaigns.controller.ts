import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateUpdateDto } from './dto/create-update.dto';
import { GalleryQueryDto } from './dto/gallery-query.dto';
import { SubmitCampaignDto } from './dto/submit-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  gallery(@Query() q: GalleryQueryDto) {
    return this.campaigns.gallery(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.campaigns.detail(id);
  }

  @Get(':id/updates')
  updates(@Param('id') id: string) {
    return this.campaigns.listUpdates(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCampaignDto) {
    return this.campaigns.createForUser(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.updateForUser(userId, id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  submit(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitCampaignDto,
  ) {
    return this.campaigns.submitForUser(userId, id, dto);
  }

  @Post(':id/updates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  postUpdate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateUpdateDto,
  ) {
    return this.campaigns.postUpdate(user, id, dto);
  }
}
