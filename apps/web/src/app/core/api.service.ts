import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AuthUser,
  CampaignCard,
  CampaignDetail,
  CampaignUpdate,
  CorporateProfile,
  DonationResult,
  OwnerCampaign,
  Payout,
  PublicDonation,
  Receipt,
  School,
  Session,
  SponsorImpact,
  Stats,
  StudentMe,
  StudentProfile,
} from './models';

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
}
