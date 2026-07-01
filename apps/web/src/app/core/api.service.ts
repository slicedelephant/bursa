import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AuthUser,
  CampaignCard,
  CampaignDetail,
  CampaignUpdate,
  CorporateInvoice,
  CorporateProfile,
  CorporateSponsorshipResult,
  DonationResult,
  DonorHistory,
  DonorNotification,
  EsgDashboard,
  HealthReport,
  NotificationFeed,
  ObsFunnel,
  ObsMetrics,
  OwnerCampaign,
  PaymentAlerts,
  Payout,
  PublicDonation,
  Receipt,
  RecurringPledge,
  RecurringRunResult,
  School,
  Session,
  SloReport,
  SponsorImpact,
  SponsorBody,
  Stats,
  StudentMe,
  StudentProfile,
  SubscriptionItem,
  TributeType,
  AdmissionImportResult,
  AdmissionRecord,
  OnboardingCompleteResult,
  OnboardingTokenState,
  PayoutFormBody,
  SchoolCampaignForApproval,
  SchoolDashboard,
  SchoolPortalProfile,
  SchoolWebhookLogItem,
  VerificationStatus,
  TrustDashboardData,
  TrustHeatMap,
  ModerationCaseItem,
  ModerationDecisionBody,
  ChargebackItem,
  FraudSignalItem,
  CampaignFlagItem,
  CreateFlagBody,
  CampaignFlagResult,
  AiBudgetView,
  AiTitleResult,
  AiStoryResult,
  AiShareResult,
  AiShareChannel,
  CoachLocale,
  VerificationCaseView,
  KycDashboardView,
  StartCaseBody,
  LivenessBody,
  DocumentBody,
  AmlScreenBody,
  ReviewDecideBody,
  ReconciliationView,
  PayoutRowView,
  LedgerView,
  TransparencyView,
  MatchOffer,
  MatchClaimResult,
  MatchBalance,
  MatchLocale,
  ReportStandard,
  CsrdReportView,
  CsrdReportSummary,
  DataQualityReport,
  TrendReport,
  AuditorGrant,
  CreatedAuditorGrant,
  PortfolioView,
  DonorReferralView,
  ReferralLeaderboardView,
  CreatedAdvocateView,
  AdvocateDashboardView,
  FeedView,
  ChannelPrefsView,
  ChannelPrefView,
  FeedChannel,
  InactivityView,
  VoiceSubmitView,
  GroupListView,
  GroupDetailView,
  CreatedGroupView,
  GroupInviteView,
  GroupRole,
  GroupMode,
  GroupVisibility,
  GroupVoteView,
  GroupChatView,
  GroupMessagePostResult,
  GroupAnalyticsView,
  ProgramSummary,
  CreateProgramBody,
  CreateProgramResult,
  FormSchemaBody,
  ApplicationRow,
  ApplicationStatus,
  ScholarRow,
  ScholarStatus,
  ScholarEvent,
  AwardDecisionResult,
  DisburseResult,
  TrancheReleaseResult,
  PublicApplicationForm,
  SubmitApplicationBody,
} from './models';

export interface TrackEventBody {
  type: string;
  visitorId?: string;
  sessionId?: string;
  campaignId?: string;
  path?: string;
  step?: string;
  metadata?: Record<string, unknown>;
}

export const API_BASE = '/api';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface GalleryQuery {
  country?: string;
  schoolId?: string;
  q?: string;
  status?: 'LIVE' | 'FUNDED' | 'DISBURSED';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private unwrap<T>(obs: Observable<Envelope<T>>): Observable<T> {
    return obs.pipe(map((r) => r.data));
  }

  // ---- Auth ----
  register(body: {
    email: string;
    password: string;
    displayName: string;
    role?: 'DONOR' | 'STUDENT' | 'SPONSOR';
  }): Observable<Session> {
    return this.unwrap(this.http.post<Envelope<Session>>(`${API_BASE}/auth/register`, body));
  }

  login(body: { email: string; password: string }): Observable<Session> {
    return this.unwrap(this.http.post<Envelope<Session>>(`${API_BASE}/auth/login`, body));
  }

  me(): Observable<{ user: AuthUser; profile: unknown }> {
    return this.unwrap(
      this.http.get<Envelope<{ user: AuthUser; profile: unknown }>>(`${API_BASE}/auth/me`),
    );
  }

  // ---- Schools ----
  listSchools(): Observable<School[]> {
    return this.unwrap(this.http.get<Envelope<School[]>>(`${API_BASE}/schools`));
  }

  createSchool(body: Partial<School>): Observable<School> {
    return this.unwrap(this.http.post<Envelope<School>>(`${API_BASE}/schools`, body));
  }

  verifySchoolPayout(
    id: string,
    body: { payoutVerified: boolean; payoutAccountRef?: string },
  ): Observable<School> {
    return this.unwrap(
      this.http.patch<Envelope<School>>(`${API_BASE}/schools/${id}/verify-payout`, body),
    );
  }

  // ---- Campaigns ----
  gallery(query: GalleryQuery = {}): Observable<CampaignCard[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) params = params.set(k, v);
    }
    return this.unwrap(
      this.http.get<Envelope<CampaignCard[]>>(`${API_BASE}/campaigns`, { params }),
    );
  }

  campaign(id: string): Observable<CampaignDetail> {
    return this.unwrap(this.http.get<Envelope<CampaignDetail>>(`${API_BASE}/campaigns/${id}`));
  }

  stats(): Observable<Stats> {
    return this.unwrap(this.http.get<Envelope<Stats>>(`${API_BASE}/stats`));
  }

  createCampaign(body: {
    schoolId: string;
    programName: string;
    title: string;
    story: string;
    goalCents: number;
    deadline?: string;
    videoUrl?: string;
    storyBackground?: string;
    storyChallenge?: string;
    storyVision?: string;
  }): Observable<OwnerCampaign> {
    return this.unwrap(this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/campaigns`, body));
  }

  updateCampaign(id: string, body: Partial<OwnerCampaign>): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.patch<Envelope<OwnerCampaign>>(`${API_BASE}/campaigns/${id}`, body),
    );
  }

  // ---- AI Fundraising Coach (E10, STUDENT) ----
  aiBudget(): Observable<AiBudgetView> {
    return this.unwrap(this.http.get<Envelope<AiBudgetView>>(`${API_BASE}/ai/budget`));
  }

  aiTitle(body: {
    country: string;
    school: string;
    program: string;
    motivation: string;
    locale?: CoachLocale;
  }): Observable<AiTitleResult> {
    return this.unwrap(this.http.post<Envelope<AiTitleResult>>(`${API_BASE}/ai/title`, body));
  }

  aiStory(body: {
    school: string;
    goalEur: number;
    motivation: string;
    background?: string;
    locale?: CoachLocale;
  }): Observable<AiStoryResult> {
    return this.unwrap(this.http.post<Envelope<AiStoryResult>>(`${API_BASE}/ai/story`, body));
  }

  aiShare(body: {
    channel: AiShareChannel;
    title: string;
    story: string;
    locale?: CoachLocale;
  }): Observable<AiShareResult> {
    return this.unwrap(this.http.post<Envelope<AiShareResult>>(`${API_BASE}/ai/share`, body));
  }

  submitCampaign(id: string, body: { admissionRef?: string }): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/campaigns/${id}/submit`, body),
    );
  }

  listUpdates(id: string): Observable<CampaignUpdate[]> {
    return this.unwrap(
      this.http.get<Envelope<CampaignUpdate[]>>(`${API_BASE}/campaigns/${id}/updates`),
    );
  }

  postUpdate(id: string, body: { title: string; body: string }): Observable<CampaignUpdate> {
    return this.unwrap(
      this.http.post<Envelope<CampaignUpdate>>(`${API_BASE}/campaigns/${id}/updates`, body),
    );
  }

  // ---- Donations ----
  donateCard(
    campaignId: string,
    body: {
      amountCents: number;
      tipCents?: number;
      message?: string;
      anonymous?: boolean;
      donorName?: string;
      donorEmail?: string;
      tributeType?: TributeType;
      tributeName?: string;
    },
  ): Observable<DonationResult> {
    return this.unwrap(
      this.http.post<Envelope<DonationResult>>(
        `${API_BASE}/campaigns/${campaignId}/donations/card`,
        body,
      ),
    );
  }

  donateSepa(
    campaignId: string,
    body: { amountCents: number; message?: string },
  ): Observable<DonationResult> {
    return this.unwrap(
      this.http.post<Envelope<DonationResult>>(
        `${API_BASE}/campaigns/${campaignId}/donations/sepa`,
        body,
      ),
    );
  }

  listDonations(campaignId: string): Observable<PublicDonation[]> {
    return this.unwrap(
      this.http.get<Envelope<PublicDonation[]>>(`${API_BASE}/campaigns/${campaignId}/donations`),
    );
  }

  // ---- Students ----
  upsertStudentProfile(body: {
    fullName: string;
    country: string;
    story: string;
    recommendation?: string;
    photoUrl?: string;
  }): Observable<StudentProfile> {
    return this.unwrap(
      this.http.put<Envelope<StudentProfile>>(`${API_BASE}/students/profile`, body),
    );
  }

  studentMe(): Observable<StudentMe> {
    return this.unwrap(this.http.get<Envelope<StudentMe>>(`${API_BASE}/students/me`));
  }

  // ---- Sponsors ----
  upsertCompany(body: {
    companyName: string;
    sector?: string;
    contactName?: string;
    logoUrl?: string;
  }): Observable<CorporateProfile> {
    return this.unwrap(
      this.http.put<Envelope<CorporateProfile>>(`${API_BASE}/sponsors/profile`, body),
    );
  }

  sponsorImpact(): Observable<SponsorImpact> {
    return this.unwrap(this.http.get<Envelope<SponsorImpact>>(`${API_BASE}/sponsors/me/impact`));
  }

  receipt(donationId: string): Observable<Receipt> {
    return this.unwrap(
      this.http.get<Envelope<Receipt>>(`${API_BASE}/sponsors/donations/${donationId}/receipt`),
    );
  }

  // ---- Admin ----
  verifications(status = 'PENDING'): Observable<OwnerCampaign[]> {
    const params = new HttpParams().set('status', status);
    return this.unwrap(
      this.http.get<Envelope<OwnerCampaign[]>>(`${API_BASE}/admin/verifications`, { params }),
    );
  }

  verifyCampaign(
    id: string,
    body: { admissionRef?: string; note?: string },
  ): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/admin/campaigns/${id}/verify`, body),
    );
  }

  rejectCampaign(id: string, body: { note: string }): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/admin/campaigns/${id}/reject`, body),
    );
  }

  payoutCampaign(campaignId: string): Observable<Payout> {
    return this.unwrap(
      this.http.post<Envelope<Payout>>(`${API_BASE}/admin/campaigns/${campaignId}/payout`, {}),
    );
  }

  payouts(): Observable<Payout[]> {
    return this.unwrap(this.http.get<Envelope<Payout[]>>(`${API_BASE}/admin/payouts`));
  }

  // ---- Donor account (E4) ----
  donorHistory(): Observable<DonorHistory> {
    return this.unwrap(this.http.get<Envelope<DonorHistory>>(`${API_BASE}/donors/me/history`));
  }

  donorReceipt(donationId: string): Observable<Receipt> {
    return this.unwrap(
      this.http.get<Envelope<Receipt>>(`${API_BASE}/donors/me/donations/${donationId}/receipt`),
    );
  }

  listNotifications(): Observable<NotificationFeed> {
    return this.unwrap(this.http.get<Envelope<NotificationFeed>>(`${API_BASE}/notifications`));
  }

  markNotificationRead(id: string): Observable<DonorNotification> {
    return this.unwrap(
      this.http.post<Envelope<DonorNotification>>(`${API_BASE}/notifications/${id}/read`, {}),
    );
  }

  // ---- Recurring (simulated) ----
  createRecurring(body: { campaignId: string; amountCents: number }): Observable<RecurringPledge> {
    return this.unwrap(
      this.http.post<Envelope<RecurringPledge>>(`${API_BASE}/donors/me/recurring`, body),
    );
  }

  listRecurring(): Observable<RecurringPledge[]> {
    return this.unwrap(
      this.http.get<Envelope<RecurringPledge[]>>(`${API_BASE}/donors/me/recurring`),
    );
  }

  setRecurringStatus(
    id: string,
    action: 'pause' | 'resume' | 'cancel',
  ): Observable<RecurringPledge> {
    return this.unwrap(
      this.http.post<Envelope<RecurringPledge>>(
        `${API_BASE}/donors/me/recurring/${id}/${action}`,
        {},
      ),
    );
  }

  runRecurring(): Observable<RecurringRunResult> {
    return this.unwrap(
      this.http.post<Envelope<RecurringRunResult>>(`${API_BASE}/donors/me/recurring/run`, {}),
    );
  }

  listSubscriptions(): Observable<SubscriptionItem[]> {
    return this.unwrap(
      this.http.get<Envelope<SubscriptionItem[]>>(`${API_BASE}/donors/me/subscriptions`),
    );
  }

  // ---- Donor portfolio & giving-streaks (E16) ----
  donorPortfolio(): Observable<PortfolioView> {
    return this.unwrap(this.http.get<Envelope<PortfolioView>>(`${API_BASE}/donors/me/portfolio`));
  }

  /** Portfolio export as a binary blob (CSV or PDF); auth token added by interceptor. */
  donorPortfolioExport(format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${API_BASE}/donors/me/portfolio/export.${format}`, {
      responseType: 'blob',
    });
  }

  // ---- Referral & advocate engine (E15) ----
  donorReferral(): Observable<DonorReferralView> {
    return this.unwrap(
      this.http.get<Envelope<DonorReferralView>>(`${API_BASE}/donors/me/referral`),
    );
  }

  setReferralOptIn(optIn: boolean): Observable<{ optInLeaderboard: boolean }> {
    return this.unwrap(
      this.http.post<Envelope<{ optInLeaderboard: boolean }>>(
        `${API_BASE}/donors/me/referral/leaderboard-opt-in`,
        { optIn },
      ),
    );
  }

  referralLeaderboard(): Observable<ReferralLeaderboardView> {
    return this.unwrap(
      this.http.get<Envelope<ReferralLeaderboardView>>(`${API_BASE}/referral/leaderboard`),
    );
  }

  inviteAdvocate(
    campaignId: string,
    body: { name: string; email?: string },
  ): Observable<CreatedAdvocateView> {
    return this.unwrap(
      this.http.post<Envelope<CreatedAdvocateView>>(
        `${API_BASE}/campaigns/${campaignId}/advocates`,
        body,
      ),
    );
  }

  campaignAdvocates(campaignId: string): Observable<AdvocateDashboardView> {
    return this.unwrap(
      this.http.get<Envelope<AdvocateDashboardView>>(
        `${API_BASE}/campaigns/${campaignId}/advocates`,
      ),
    );
  }

  advocateLeaderboard(campaignId: string): Observable<ReferralLeaderboardView> {
    return this.unwrap(
      this.http.get<Envelope<ReferralLeaderboardView>>(
        `${API_BASE}/campaigns/${campaignId}/advocate-leaderboard`,
      ),
    );
  }

  // ---- Multi-Channel Impact-Feed (E17) ----
  feed(): Observable<FeedView> {
    return this.unwrap(this.http.get<Envelope<FeedView>>(`${API_BASE}/feed`));
  }

  markFeedRead(itemKey: string): Observable<{ read: boolean }> {
    return this.unwrap(
      this.http.post<Envelope<{ read: boolean }>>(
        `${API_BASE}/feed/${encodeURIComponent(itemKey)}/read`,
        {},
      ),
    );
  }

  channelPrefs(): Observable<ChannelPrefsView> {
    return this.unwrap(this.http.get<Envelope<ChannelPrefsView>>(`${API_BASE}/feed/channel-prefs`));
  }

  setChannelPref(body: ChannelPrefView): Observable<{ channel: FeedChannel; optIn: boolean }> {
    return this.unwrap(
      this.http.put<Envelope<{ channel: FeedChannel; optIn: boolean }>>(
        `${API_BASE}/feed/channel-prefs`,
        body,
      ),
    );
  }

  feedInactivity(): Observable<InactivityView> {
    return this.unwrap(this.http.get<Envelope<InactivityView>>(`${API_BASE}/feed/inactivity`));
  }

  submitStudentVoice(
    campaignId: string,
    body: { text: string; videoUrl?: string; voiceUrl?: string },
  ): Observable<VoiceSubmitView> {
    return this.unwrap(
      this.http.post<Envelope<VoiceSubmitView>>(`${API_BASE}/campaigns/${campaignId}/voice`, body),
    );
  }

  // ---- Employer matching (E13) ----
  matchOffer(body: {
    campaignId: string;
    donationCents: number;
    workEmail?: string;
    locale?: MatchLocale;
  }): Observable<MatchOffer> {
    return this.unwrap(this.http.post<Envelope<MatchOffer>>(`${API_BASE}/matching/offer`, body));
  }

  matchClaim(body: {
    donationId: string;
    workEmail?: string;
    locale?: MatchLocale;
  }): Observable<MatchClaimResult> {
    return this.unwrap(
      this.http.post<Envelope<MatchClaimResult>>(`${API_BASE}/matching/claim`, body),
    );
  }

  matchBalance(): Observable<MatchBalance> {
    return this.unwrap(this.http.get<Envelope<MatchBalance>>(`${API_BASE}/matching/me/balance`));
  }

  // ---- Corporate channel (E5) ----
  corporateSponsor(campaignId: string, body: SponsorBody): Observable<CorporateSponsorshipResult> {
    return this.unwrap(
      this.http.post<Envelope<CorporateSponsorshipResult>>(
        `${API_BASE}/campaigns/${campaignId}/corporate/sponsor`,
        body,
      ),
    );
  }

  esgDashboard(): Observable<EsgDashboard> {
    return this.unwrap(this.http.get<Envelope<EsgDashboard>>(`${API_BASE}/sponsors/me/esg`));
  }

  /** ESG export as a binary blob (CSV or PDF); the auth token is added by the interceptor. */
  esgExport(format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${API_BASE}/sponsors/me/esg/export.${format}`, {
      responseType: 'blob',
    });
  }

  corporateInvoice(sponsorshipId: string): Observable<CorporateInvoice> {
    return this.unwrap(
      this.http.get<Envelope<CorporateInvoice>>(
        `${API_BASE}/sponsors/me/sponsorships/${sponsorshipId}/invoice`,
      ),
    );
  }

  settleSponsorship(sponsorshipId: string): Observable<CorporateInvoice> {
    return this.unwrap(
      this.http.post<Envelope<CorporateInvoice>>(
        `${API_BASE}/sponsors/me/sponsorships/${sponsorshipId}/settle`,
        {},
      ),
    );
  }

  // ---- Account / GDPR (E6) ----
  /** Right of access: the authenticated user's own data as a structured export. */
  exportMyData(): Observable<unknown> {
    return this.unwrap(this.http.get<Envelope<unknown>>(`${API_BASE}/account/export`));
  }

  /** Right to erasure: anonymises the account (keeps the money trail). */
  deleteMyAccount(): Observable<{ anonymized: boolean; anonymizedAt: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ anonymized: boolean; anonymizedAt: string }>>(
        `${API_BASE}/account/delete`,
        {},
      ),
    );
  }

  // ---- Observability & funnel analytics (E7) ----
  /** Privacy-aware product/funnel event ingest (anonymous visitorId, no PII). */
  trackEvent(body: TrackEventBody): Observable<{ recorded: boolean }> {
    return this.unwrap(
      this.http.post<Envelope<{ recorded: boolean }>>(`${API_BASE}/analytics/events`, body),
    );
  }

  health(): Observable<HealthReport> {
    return this.unwrap(this.http.get<Envelope<HealthReport>>(`${API_BASE}/health`));
  }

  obsFunnel(campaignId?: string): Observable<ObsFunnel> {
    let params = new HttpParams();
    if (campaignId) params = params.set('campaignId', campaignId);
    return this.unwrap(
      this.http.get<Envelope<ObsFunnel>>(`${API_BASE}/observability/funnel`, {
        params,
      }),
    );
  }

  obsMetrics(): Observable<ObsMetrics> {
    return this.unwrap(this.http.get<Envelope<ObsMetrics>>(`${API_BASE}/observability/metrics`));
  }

  obsSlo(): Observable<SloReport> {
    return this.unwrap(this.http.get<Envelope<SloReport>>(`${API_BASE}/observability/slo`));
  }

  obsPaymentAlerts(): Observable<PaymentAlerts> {
    return this.unwrap(
      this.http.get<Envelope<PaymentAlerts>>(`${API_BASE}/observability/payment-alerts`),
    );
  }

  // ---- E8: School Self-Serve Portal ----
  schoolMe(): Observable<SchoolPortalProfile> {
    return this.unwrap(this.http.get<Envelope<SchoolPortalProfile>>(`${API_BASE}/school/me`));
  }

  schoolDashboard(): Observable<SchoolDashboard> {
    return this.unwrap(this.http.get<Envelope<SchoolDashboard>>(`${API_BASE}/school/dashboard`));
  }

  schoolSavePayout(body: PayoutFormBody): Observable<SchoolProfileRaw> {
    return this.unwrap(
      this.http.put<Envelope<SchoolProfileRaw>>(`${API_BASE}/school/payout`, body),
    );
  }

  schoolSignAgreement(body: { signerName: string }): Observable<SchoolProfileRaw> {
    return this.unwrap(
      this.http.post<Envelope<SchoolProfileRaw>>(`${API_BASE}/school/agreement/sign`, body),
    );
  }

  schoolImportAdmissions(csv: string): Observable<AdmissionImportResult> {
    return this.unwrap(
      this.http.post<Envelope<AdmissionImportResult>>(`${API_BASE}/school/admissions/import`, {
        csv,
      }),
    );
  }

  schoolAdmissions(status?: VerificationStatus): Observable<AdmissionRecord[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.unwrap(
      this.http.get<Envelope<AdmissionRecord[]>>(`${API_BASE}/school/admissions`, { params }),
    );
  }

  schoolVerifyAdmission(id: string): Observable<AdmissionRecord> {
    return this.unwrap(
      this.http.post<Envelope<AdmissionRecord>>(`${API_BASE}/school/admissions/${id}/verify`, {}),
    );
  }

  schoolRejectAdmission(id: string, note: string): Observable<AdmissionRecord> {
    return this.unwrap(
      this.http.post<Envelope<AdmissionRecord>>(`${API_BASE}/school/admissions/${id}/reject`, {
        note,
      }),
    );
  }

  schoolCampaigns(): Observable<SchoolCampaignForApproval[]> {
    return this.unwrap(
      this.http.get<Envelope<SchoolCampaignForApproval[]>>(`${API_BASE}/school/campaigns`),
    );
  }

  schoolApproveCampaign(id: string): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/school/campaigns/${id}/approve`, {}),
    );
  }

  schoolRejectCampaign(id: string, note: string): Observable<OwnerCampaign> {
    return this.unwrap(
      this.http.post<Envelope<OwnerCampaign>>(`${API_BASE}/school/campaigns/${id}/reject`, {
        note,
      }),
    );
  }

  schoolWebhooks(): Observable<SchoolWebhookLogItem[]> {
    return this.unwrap(
      this.http.get<Envelope<SchoolWebhookLogItem[]>>(`${API_BASE}/school/webhooks`),
    );
  }

  // Hosted onboarding flow (public, token-gated).
  onboardingState(token: string): Observable<OnboardingTokenState> {
    return this.unwrap(
      this.http.get<Envelope<OnboardingTokenState>>(`${API_BASE}/school/onboarding/${token}`),
    );
  }

  completeOnboarding(
    token: string,
    body: PayoutFormBody & { signerName: string },
  ): Observable<OnboardingCompleteResult> {
    return this.unwrap(
      this.http.post<Envelope<OnboardingCompleteResult>>(
        `${API_BASE}/school/onboarding/${token}/complete`,
        body,
      ),
    );
  }

  // ---- E9: Trust & Safety Operations Console ----
  trustDashboard(): Observable<TrustDashboardData> {
    return this.unwrap(
      this.http.get<Envelope<TrustDashboardData>>(`${API_BASE}/trust-safety/dashboard`),
    );
  }

  trustHeatMap(): Observable<TrustHeatMap> {
    return this.unwrap(this.http.get<Envelope<TrustHeatMap>>(`${API_BASE}/trust-safety/heat-map`));
  }

  trustModeration(status?: string): Observable<ModerationCaseItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.unwrap(
      this.http.get<Envelope<ModerationCaseItem[]>>(`${API_BASE}/trust-safety/moderation`, {
        params,
      }),
    );
  }

  trustScanCampaign(campaignId: string): Observable<unknown> {
    return this.unwrap(
      this.http.post<Envelope<unknown>>(
        `${API_BASE}/trust-safety/campaigns/${campaignId}/scan`,
        {},
      ),
    );
  }

  trustDecideModeration(id: string, body: ModerationDecisionBody): Observable<unknown> {
    return this.unwrap(
      this.http.post<Envelope<unknown>>(`${API_BASE}/trust-safety/moderation/${id}/decide`, body),
    );
  }

  trustChargebacks(status?: string): Observable<ChargebackItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.unwrap(
      this.http.get<Envelope<ChargebackItem[]>>(`${API_BASE}/trust-safety/chargebacks`, {
        params,
      }),
    );
  }

  trustSubmitEvidence(id: string, note: string): Observable<ChargebackItem> {
    return this.unwrap(
      this.http.post<Envelope<ChargebackItem>>(
        `${API_BASE}/trust-safety/chargebacks/${id}/evidence`,
        { note },
      ),
    );
  }

  trustOfferRefund(id: string): Observable<ChargebackItem> {
    return this.unwrap(
      this.http.post<Envelope<ChargebackItem>>(
        `${API_BASE}/trust-safety/chargebacks/${id}/offer-refund`,
        {},
      ),
    );
  }

  trustFraudSignals(
    query: { donorUserId?: string; kind?: string } = {},
  ): Observable<FraudSignalItem[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) params = params.set(k, v);
    }
    return this.unwrap(
      this.http.get<Envelope<FraudSignalItem[]>>(`${API_BASE}/trust-safety/fraud-signals`, {
        params,
      }),
    );
  }

  trustFlags(status?: string): Observable<CampaignFlagItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.unwrap(
      this.http.get<Envelope<CampaignFlagItem[]>>(`${API_BASE}/trust-safety/flags`, { params }),
    );
  }

  flagCampaign(campaignId: string, body: CreateFlagBody): Observable<CampaignFlagResult> {
    return this.unwrap(
      this.http.post<Envelope<CampaignFlagResult>>(
        `${API_BASE}/campaigns/${campaignId}/flags`,
        body,
      ),
    );
  }

  // ---- E11: KYC & Verification Pipeline ----
  kycStartCase(body: StartCaseBody): Observable<VerificationCaseView> {
    return this.unwrap(
      this.http.post<Envelope<VerificationCaseView>>(`${API_BASE}/kyc/cases`, body),
    );
  }

  kycLiveness(caseId: string, body: LivenessBody): Observable<VerificationCaseView> {
    return this.unwrap(
      this.http.post<Envelope<VerificationCaseView>>(
        `${API_BASE}/kyc/cases/${caseId}/liveness`,
        body,
      ),
    );
  }

  kycDocument(caseId: string, body: DocumentBody): Observable<VerificationCaseView> {
    return this.unwrap(
      this.http.post<Envelope<VerificationCaseView>>(
        `${API_BASE}/kyc/cases/${caseId}/document`,
        body,
      ),
    );
  }

  kycMyCases(): Observable<VerificationCaseView[]> {
    return this.unwrap(this.http.get<Envelope<VerificationCaseView[]>>(`${API_BASE}/kyc/cases/me`));
  }

  kycScreenAml(body: AmlScreenBody): Observable<VerificationCaseView> {
    return this.unwrap(
      this.http.post<Envelope<VerificationCaseView>>(`${API_BASE}/kyc/aml/screen`, body),
    );
  }

  kycReviewQueue(status?: string): Observable<VerificationCaseView[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.unwrap(
      this.http.get<Envelope<VerificationCaseView[]>>(`${API_BASE}/kyc/review/queue`, {
        params,
      }),
    );
  }

  kycReviewDashboard(): Observable<KycDashboardView> {
    return this.unwrap(
      this.http.get<Envelope<KycDashboardView>>(`${API_BASE}/kyc/review/dashboard`),
    );
  }

  kycReviewDecide(caseId: string, body: ReviewDecideBody): Observable<VerificationCaseView> {
    return this.unwrap(
      this.http.post<Envelope<VerificationCaseView>>(
        `${API_BASE}/kyc/review/${caseId}/decide`,
        body,
      ),
    );
  }

  // ---- E12: Payout Reconciliation & Transparency ----
  schoolReconciliation(): Observable<ReconciliationView> {
    return this.unwrap(
      this.http.get<Envelope<ReconciliationView>>(`${API_BASE}/school/reconciliation`),
    );
  }

  schoolReconciliationPayouts(): Observable<PayoutRowView[]> {
    return this.unwrap(
      this.http.get<Envelope<PayoutRowView[]>>(`${API_BASE}/school/reconciliation/payouts`),
    );
  }

  schoolLedger(): Observable<LedgerView> {
    return this.unwrap(this.http.get<Envelope<LedgerView>>(`${API_BASE}/school/ledger`));
  }

  // ---- ESG / CSRD compliance reporting (E14, ADMIN) ----

  csrdReport(standard: ReportStandard, year?: number): Observable<CsrdReportView> {
    let params = new HttpParams().set('standard', standard);
    if (year) params = params.set('year', String(year));
    return this.unwrap(
      this.http.get<Envelope<CsrdReportView>>(`${API_BASE}/admin/esg/report`, {
        params,
      }),
    );
  }

  csrdCreateReport(standard: ReportStandard, year?: number): Observable<CsrdReportSummary> {
    return this.unwrap(
      this.http.post<Envelope<CsrdReportSummary>>(`${API_BASE}/admin/esg/reports`, {
        standard,
        year,
      }),
    );
  }

  csrdListReports(): Observable<CsrdReportSummary[]> {
    return this.unwrap(
      this.http.get<Envelope<CsrdReportSummary[]>>(`${API_BASE}/admin/esg/reports`),
    );
  }

  csrdDataQuality(): Observable<DataQualityReport> {
    return this.unwrap(
      this.http.get<Envelope<DataQualityReport>>(`${API_BASE}/admin/esg/data-quality`),
    );
  }

  csrdTrend(): Observable<TrendReport> {
    return this.unwrap(this.http.get<Envelope<TrendReport>>(`${API_BASE}/admin/esg/trend`));
  }

  csrdListGrants(): Observable<AuditorGrant[]> {
    return this.unwrap(
      this.http.get<Envelope<AuditorGrant[]>>(`${API_BASE}/admin/esg/auditor-grants`),
    );
  }

  csrdCreateGrant(body: {
    label: string;
    ttlHours?: number;
    scope?: string;
  }): Observable<CreatedAuditorGrant> {
    return this.unwrap(
      this.http.post<Envelope<CreatedAuditorGrant>>(`${API_BASE}/admin/esg/auditor-grants`, body),
    );
  }

  csrdRevokeGrant(id: string): Observable<{ id: string; revokedAt: string | null }> {
    return this.unwrap(
      this.http.post<Envelope<{ id: string; revokedAt: string | null }>>(
        `${API_BASE}/admin/esg/auditor-grants/${id}/revoke`,
        {},
      ),
    );
  }

  /** ESG report export as a binary blob (CSV or PDF); auth token added by interceptor. */
  csrdReportExport(reportId: string, format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${API_BASE}/admin/esg/reports/${reportId}/export.${format}`, {
      responseType: 'blob',
    });
  }

  /** Absolute URLs for the file-download endpoints (opened in a new tab). */
  reconciliationExportUrl(kind: 'csv' | 'pdf' | 'tax' | 'accounting'): string {
    switch (kind) {
      case 'pdf':
        return `${API_BASE}/school/reconciliation/export.pdf`;
      case 'tax':
        return `${API_BASE}/school/reconciliation/tax-report.csv`;
      case 'accounting':
        return `${API_BASE}/school/reconciliation/accounting.csv`;
      case 'csv':
      default:
        return `${API_BASE}/school/reconciliation/export.csv`;
    }
  }

  transparency(schoolId: string): Observable<TransparencyView> {
    return this.unwrap(
      this.http.get<Envelope<TransparencyView>>(`${API_BASE}/transparency/schools/${schoolId}`),
    );
  }

  // ---- Groups-Engine (E18): one engine, two modes ----

  createGroup(body: {
    mode: GroupMode;
    visibility?: GroupVisibility;
    name: string;
    description?: string;
    logoUrl?: string;
    sharedGoalCents?: number;
    stretchThresholdPct?: number;
  }): Observable<CreatedGroupView> {
    return this.unwrap(this.http.post<Envelope<CreatedGroupView>>(`${API_BASE}/groups`, body));
  }

  listGroups(): Observable<GroupListView> {
    return this.unwrap(this.http.get<Envelope<GroupListView>>(`${API_BASE}/groups`));
  }

  getGroup(id: string): Observable<GroupDetailView> {
    return this.unwrap(this.http.get<Envelope<GroupDetailView>>(`${API_BASE}/groups/${id}`));
  }

  inviteToGroup(
    id: string,
    body: { role?: GroupRole; expiresInDays?: number },
  ): Observable<GroupInviteView> {
    return this.unwrap(
      this.http.post<Envelope<GroupInviteView>>(`${API_BASE}/groups/${id}/invites`, body),
    );
  }

  joinGroup(id: string, token: string): Observable<{ groupId: string; role: GroupRole }> {
    return this.unwrap(
      this.http.post<Envelope<{ groupId: string; role: GroupRole }>>(
        `${API_BASE}/groups/${id}/join`,
        { token },
      ),
    );
  }

  leaveGroup(id: string): Observable<{ left: boolean }> {
    return this.unwrap(
      this.http.post<Envelope<{ left: boolean }>>(`${API_BASE}/groups/${id}/leave`, {}),
    );
  }

  setGroupRole(
    id: string,
    userId: string,
    role: GroupRole,
  ): Observable<{ userId: string; role: GroupRole }> {
    return this.unwrap(
      this.http.put<Envelope<{ userId: string; role: GroupRole }>>(
        `${API_BASE}/groups/${id}/members/${userId}/role`,
        { role },
      ),
    );
  }

  addGroupCampaign(
    id: string,
    campaignId: string,
  ): Observable<{ groupId: string; campaignId: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ groupId: string; campaignId: string }>>(
        `${API_BASE}/groups/${id}/campaigns`,
        { campaignId },
      ),
    );
  }

  contributeToGroup(
    id: string,
    donationId: string,
  ): Observable<{ groupId: string; donationId: string; valueCents: number }> {
    return this.unwrap(
      this.http.post<Envelope<{ groupId: string; donationId: string; valueCents: number }>>(
        `${API_BASE}/groups/${id}/contributions`,
        { donationId },
      ),
    );
  }

  groupAnalytics(id: string): Observable<GroupAnalyticsView> {
    return this.unwrap(
      this.http.get<Envelope<GroupAnalyticsView>>(`${API_BASE}/groups/${id}/analytics`),
    );
  }

  openGroupVote(
    id: string,
    body: { question: string; options: { campaignId: string; label: string }[] },
  ): Observable<{ id: string; status: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ id: string; status: string }>>(
        `${API_BASE}/groups/${id}/votes`,
        body,
      ),
    );
  }

  castGroupBallot(
    id: string,
    voteId: string,
    optionId: string,
  ): Observable<{ voteId: string; optionId: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ voteId: string; optionId: string }>>(
        `${API_BASE}/groups/${id}/votes/${voteId}/ballot`,
        { optionId },
      ),
    );
  }

  getGroupVote(id: string, voteId: string): Observable<GroupVoteView> {
    return this.unwrap(
      this.http.get<Envelope<GroupVoteView>>(`${API_BASE}/groups/${id}/votes/${voteId}`),
    );
  }

  postGroupMessage(id: string, text: string): Observable<GroupMessagePostResult> {
    return this.unwrap(
      this.http.post<Envelope<GroupMessagePostResult>>(`${API_BASE}/groups/${id}/messages`, {
        text,
      }),
    );
  }

  groupMessages(id: string): Observable<GroupChatView> {
    return this.unwrap(this.http.get<Envelope<GroupChatView>>(`${API_BASE}/groups/${id}/messages`));
  }

  // ---- Scholarship Program Manager (E19) ----

  listScholarshipPrograms(): Observable<ProgramSummary[]> {
    return this.unwrap(
      this.http.get<Envelope<ProgramSummary[]>>(`${API_BASE}/scholarship/programs`),
    );
  }

  createScholarshipProgram(body: CreateProgramBody): Observable<CreateProgramResult> {
    return this.unwrap(
      this.http.post<Envelope<CreateProgramResult>>(`${API_BASE}/scholarship/programs`, body),
    );
  }

  setScholarshipForm(
    programId: string,
    body: FormSchemaBody,
  ): Observable<{ formId: string; fieldCount: number }> {
    return this.unwrap(
      this.http.put<Envelope<{ formId: string; fieldCount: number }>>(
        `${API_BASE}/scholarship/programs/${programId}/form`,
        body,
      ),
    );
  }

  addScholarshipReviewer(
    programId: string,
    body: { reviewerName: string; reviewerEmail: string },
  ): Observable<{ reviewerId: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ reviewerId: string }>>(
        `${API_BASE}/scholarship/programs/${programId}/reviewers`,
        body,
      ),
    );
  }

  createApplicationSlot(
    programId: string,
  ): Observable<{ applicationId: string; applyToken: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ applicationId: string; applyToken: string }>>(
        `${API_BASE}/scholarship/programs/${programId}/application-slot`,
        {},
      ),
    );
  }

  listScholarshipApplications(programId: string): Observable<ApplicationRow[]> {
    return this.unwrap(
      this.http.get<Envelope<ApplicationRow[]>>(
        `${API_BASE}/scholarship/programs/${programId}/applications`,
      ),
    );
  }

  scoreApplication(
    applicationId: string,
    body: {
      reviewerId: string;
      scores: { fieldKey: string; score: number; comment?: string }[];
    },
  ): Observable<{ consensusScore: number }> {
    return this.unwrap(
      this.http.post<Envelope<{ consensusScore: number }>>(
        `${API_BASE}/scholarship/applications/${applicationId}/scores`,
        body,
      ),
    );
  }

  decideScholarshipAwards(programId: string, cycleYear: number): Observable<AwardDecisionResult> {
    return this.unwrap(
      this.http.post<Envelope<AwardDecisionResult>>(
        `${API_BASE}/scholarship/programs/${programId}/decide`,
        { cycleYear },
      ),
    );
  }

  disburseAward(awardId: string): Observable<DisburseResult> {
    return this.unwrap(
      this.http.post<Envelope<DisburseResult>>(
        `${API_BASE}/scholarship/awards/${awardId}/disburse`,
        {},
      ),
    );
  }

  releaseTranche(awardId: string, gpa: number): Observable<TrancheReleaseResult> {
    return this.unwrap(
      this.http.post<Envelope<TrancheReleaseResult>>(
        `${API_BASE}/scholarship/awards/${awardId}/release-tranche`,
        { gpa },
      ),
    );
  }

  listScholars(programId: string): Observable<ScholarRow[]> {
    return this.unwrap(
      this.http.get<Envelope<ScholarRow[]>>(
        `${API_BASE}/scholarship/programs/${programId}/scholars`,
      ),
    );
  }

  setScholarStatus(
    scholarId: string,
    event: ScholarEvent,
  ): Observable<{ scholarId: string; status: ScholarStatus }> {
    return this.unwrap(
      this.http.put<Envelope<{ scholarId: string; status: ScholarStatus }>>(
        `${API_BASE}/scholarship/scholars/${scholarId}/status`,
        { event },
      ),
    );
  }

  messageScholar(
    scholarId: string,
    channel: string,
    body: string,
  ): Observable<{ sent: boolean; ref?: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ sent: boolean; ref?: string }>>(
        `${API_BASE}/scholarship/scholars/${scholarId}/message`,
        { channel, body },
      ),
    );
  }

  /** Impact report export as a binary blob (CSV or PDF); auth added by the interceptor. */
  scholarshipReport(programId: string, format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${API_BASE}/scholarship/programs/${programId}/report.${format}`, {
      responseType: 'blob',
    });
  }

  renewScholarshipProgram(
    programId: string,
    body: { budgetCents?: number; slots?: number; awardCents?: number },
  ): Observable<{ cycle: { year: number }; fieldsCopied: number }> {
    return this.unwrap(
      this.http.post<Envelope<{ cycle: { year: number }; fieldsCopied: number }>>(
        `${API_BASE}/scholarship/programs/${programId}/renew`,
        body,
      ),
    );
  }

  // Public applicant surface (no auth; token-gated).
  publicApplicationForm(token: string): Observable<PublicApplicationForm> {
    return this.unwrap(
      this.http.get<Envelope<PublicApplicationForm>>(`${API_BASE}/apply/${token}`),
    );
  }

  submitApplication(
    token: string,
    body: SubmitApplicationBody,
  ): Observable<{ applicationId: string }> {
    return this.unwrap(
      this.http.post<Envelope<{ applicationId: string }>>(`${API_BASE}/apply/${token}`, body),
    );
  }

  applicationStatus(token: string): Observable<{ status: ApplicationStatus }> {
    return this.unwrap(
      this.http.get<Envelope<{ status: ApplicationStatus }>>(`${API_BASE}/apply/${token}/status`),
    );
  }
}

/** Raw school row returned by payout/agreement mutations (not the portal envelope). */
type SchoolProfileRaw = School & { onboardingStatus: string; payoutVerified: boolean };
