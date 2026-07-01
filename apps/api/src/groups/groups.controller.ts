import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  AddCampaignDto,
  CastBallotDto,
  CohortMatchDto,
  ContributeDto,
  CreateGroupDto,
  CreateInviteDto,
  JoinGroupDto,
  OpenVoteDto,
  PostMessageDto,
  SetRoleDto,
} from './dto/group.dto';
import { GroupsService } from './groups.service';

/**
 * E18 Groups-Engine endpoints. All routes are JWT-guarded; fine-grained
 * authorization runs on the per-GROUP role (ADMIN/CONTRIBUTOR/VIEWER) inside the
 * service, not just the global app role. JSON routes use the {success,data}
 * envelope. The cohort match reuses the E5 corporate flow — no new payment path.
 */
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.groups.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.groups.list(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groups.get(userId, id);
  }

  // ---- Membership + invites ----

  @Post(':id/invites')
  invite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.groups.invite(userId, id, dto);
  }

  @Post(':id/join')
  join(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: JoinGroupDto,
  ) {
    return this.groups.join(userId, id, dto);
  }

  @Post(':id/leave')
  leave(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groups.leave(userId, id);
  }

  @Put(':id/members/:userId/role')
  setRole(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: SetRoleDto,
  ) {
    return this.groups.setRole(actorId, id, targetUserId, dto);
  }

  // ---- Cohort: sub-campaigns + match ----

  @Post(':id/campaigns')
  addCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddCampaignDto,
  ) {
    return this.groups.addCampaign(userId, id, dto);
  }

  @Post(':id/match')
  match(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CohortMatchDto,
  ) {
    return this.groups.matchCohort(userId, id, dto);
  }

  // ---- Circle: contributions + analytics ----

  @Post(':id/contributions')
  contribute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ContributeDto,
  ) {
    return this.groups.contribute(userId, id, dto);
  }

  @Get(':id/analytics')
  analytics(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groups.analytics(userId, id);
  }

  // ---- Voting ----

  @Post(':id/votes')
  openVote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: OpenVoteDto,
  ) {
    return this.groups.openVote(userId, id, dto);
  }

  @Post(':id/votes/:voteId/ballot')
  castBallot(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('voteId') voteId: string,
    @Body() dto: CastBallotDto,
  ) {
    return this.groups.castBallot(userId, id, voteId, dto);
  }

  @Get(':id/votes/:voteId')
  voteState(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('voteId') voteId: string,
  ) {
    return this.groups.voteState(userId, id, voteId);
  }

  @Post(':id/votes/:voteId/close')
  closeVote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('voteId') voteId: string,
  ) {
    return this.groups.closeVote(userId, id, voteId);
  }

  // ---- Moderated chat ----

  @Post(':id/messages')
  postMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.groups.postMessage(userId, id, dto);
  }

  @Get(':id/messages')
  messages(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groups.messages(userId, id);
  }
}
