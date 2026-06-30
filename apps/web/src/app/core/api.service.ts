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
}

/** Raw school row returned by payout/agreement mutations (not the portal envelope). */
type SchoolProfileRaw = School & { onboardingStatus: string; payoutVerified: boolean };
