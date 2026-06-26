// API response models for Bursa (mirror specs/001-bursa-funding-platform/contracts/api.md).

export type Role = 'STUDENT' | 'DONOR' | 'SPONSOR' | 'ADMIN';

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'LIVE'
  | 'FUNDED'
  | 'DISBURSED'
  | 'CLOSED'
  | 'REJECTED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DonationType = 'PRIVATE' | 'CORPORATE';
export type PayoutStatus = 'PENDING' | 'SENT' | 'CONFIRMED';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

export interface School {
  id: string;
  name: string;
  country: string;
  city?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  payoutVerified: boolean;
  payoutAccountRef?: string | null;
}

export interface CampaignCard {
  id: string;
  title: string;
  programName: string;
  studentName: string;
  studentCountry: string;
  photoUrl?: string | null;
  schoolId: string;
  schoolName: string;
  schoolCountry: string;
  goalCents: number;
  raisedCents: number;
  currency: string;
  status: CampaignStatus;
  percent: number;
  verified: boolean;
}

export interface PublicDonation {
  id: string;
  donorName: string;
  amountCents: number;
  message?: string | null;
  type: DonationType;
  createdAt: string;
}

export interface CampaignUpdate {
  id: string;
  title: string;
  body: string;
  type: 'MANUAL' | 'SYSTEM';
  createdAt: string;
}

export interface CampaignDetail extends CampaignCard {
  story: string;
  recommendation?: string | null;
  deadline?: string | null;
  tipsCents: number;
  school: School;
  donorCount: number;
  recentDonations: PublicDonation[];
  updates: CampaignUpdate[];
}

export interface Stats {
  totalRaisedCents: number;
  studentsFunded: number;
  campaignsLive: number;
  schools: number;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  country: string;
  photoUrl?: string | null;
  story: string;
  recommendation?: string | null;
}

export interface CorporateProfile {
  id: string;
  userId: string;
  companyName: string;
  sector?: string | null;
  contactName?: string | null;
  logoUrl?: string | null;
}

/** A campaign as seen by its owner/admin (any status, with relations). */
export interface OwnerCampaign {
  id: string;
  title: string;
  programName: string;
  story: string;
  goalCents: number;
  raisedCents: number;
  tipsCents: number;
  currency: string;
  status: CampaignStatus;
  deadline?: string | null;
  schoolId: string;
  school?: School;
  verification?: { status: VerificationStatus; note?: string | null } | null;
  studentProfile?: StudentProfile;
}

export interface StudentMe {
  profile: StudentProfile | null;
  campaign: OwnerCampaign | null;
}

export interface DonationResult {
  donation: { id: string; amountCents: number; tipCents: number; status: string };
  campaign: {
    id: string;
    status: CampaignStatus;
    goalCents: number;
    raisedCents: number;
    tipsCents: number;
    currency: string;
    percent: number;
  };
  receipt?: Receipt;
}

export interface Receipt {
  receiptNo: string;
  date: string;
  donor: string;
  amountCents: number;
  currency: string;
  campaign: string;
  school: string;
  issuer: string;
}

export interface SponsorImpact {
  totalCommittedCents: number;
  studentsSupported: number;
  campaignsSupported: {
    campaignId: string;
    title: string;
    schoolName: string;
    amountCents: number;
  }[];
  donations: { id: string; amountCents: number; campaignTitle?: string; createdAt: string }[];
}

export interface Payout {
  id: string;
  campaignId: string;
  schoolId: string;
  amountCents: number;
  status: PayoutStatus;
  reference: string;
  createdAt: string;
  campaign?: { title: string; studentProfile?: { fullName: string } };
  school?: { name: string };
}
