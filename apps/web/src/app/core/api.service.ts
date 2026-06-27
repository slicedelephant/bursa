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
    return this.unwrap(
      this.http.get<Envelope<DonorHistory>>(`${API_BASE}/donors/me/history`),
    );
  }

  donorReceipt(donationId: string): Observable<Receipt> {
    return this.unwrap(
      this.http.get<Envelope<Receipt>>(
        `${API_BASE}/donors/me/donations/${donationId}/receipt`,
      ),
    );
  }

  listNotifications(): Observable<NotificationFeed> {
    return this.unwrap(
      this.http.get<Envelope<NotificationFeed>>(`${API_BASE}/notifications`),
    );
  }

  markNotificationRead(id: string): Observable<DonorNotification> {
    return this.unwrap(
      this.http.post<Envelope<DonorNotification>>(
        `${API_BASE}/notifications/${id}/read`,
        {},
      ),
    );
  }

  // ---- Recurring (simulated) ----
  createRecurring(body: {
    campaignId: string;
    amountCents: number;
  }): Observable<RecurringPledge> {
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
      this.http.post<Envelope<RecurringRunResult>>(
        `${API_BASE}/donors/me/recurring/run`,
        {},
      ),
    );
  }

  listSubscriptions(): Observable<SubscriptionItem[]> {
    return this.unwrap(
      this.http.get<Envelope<SubscriptionItem[]>>(`${API_BASE}/donors/me/subscriptions`),
    );
  }

  // ---- Corporate channel (E5) ----
  corporateSponsor(
    campaignId: string,
    body: SponsorBody,
  ): Observable<CorporateSponsorshipResult> {
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
      this.http.post<Envelope<{ recorded: boolean }>>(
        `${API_BASE}/analytics/events`,
        body,
      ),
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
    return this.unwrap(
      this.http.get<Envelope<ObsMetrics>>(`${API_BASE}/observability/metrics`),
    );
  }

  obsSlo(): Observable<SloReport> {
    return this.unwrap(
      this.http.get<Envelope<SloReport>>(`${API_BASE}/observability/slo`),
    );
  }

  obsPaymentAlerts(): Observable<PaymentAlerts> {
    return this.unwrap(
      this.http.get<Envelope<PaymentAlerts>>(
        `${API_BASE}/observability/payment-alerts`,
      ),
    );
  }
}
