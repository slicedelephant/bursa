import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ChannelPrefDto } from './dto/channel-pref.dto';
import { StudentVoiceDto } from './dto/student-voice.dto';
import { ImpactFeedService } from './impact-feed.service';

/** Donor face (E17): the personalized impact feed, read tracking, channel
 * preferences and the inactivity reminder. Layers on top of the E4 donor area. */
@Controller('feed')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class FeedController {
  constructor(private readonly feed: ImpactFeedService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.feed.feed(userId);
  }

  @Post(':itemKey/read')
  markRead(
    @CurrentUser('id') userId: string,
    @Param('itemKey') itemKey: string,
  ) {
    return this.feed.markRead(userId, itemKey);
  }

  @Get('channel-prefs')
  channelPrefs(@CurrentUser('id') userId: string) {
    return this.feed.channelPrefs(userId);
  }

  @Put('channel-prefs')
  setChannelPref(
    @CurrentUser('id') userId: string,
    @Body() dto: ChannelPrefDto,
  ) {
    return this.feed.setChannelPref(userId, dto);
  }

  @Get('inactivity')
  inactivity(@CurrentUser('id') userId: string) {
    return this.feed.inactivity(userId);
  }
}

/** Student face (E17): send a short, moderated thank-you message (text + URLs). */
@Controller('campaigns/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentVoiceController {
  constructor(private readonly feed: ImpactFeedService) {}

  @Post('voice')
  @Roles(Role.STUDENT)
  submit(
    @CurrentUser('id') userId: string,
    @Param('id') campaignId: string,
    @Body() dto: StudentVoiceDto,
  ) {
    return this.feed.submitVoice(userId, campaignId, dto);
  }
}
