// API response models for Bursa (mirror specs/001-bursa-funding-platform/contracts/api.md).

export type Role = 'STUDENT' | 'DONOR' | 'SPONSOR' | 'ADMIN';

export type CampaignStatus =
  'DRAFT' | 'PENDING_VERIFICATION' | 'LIVE' | 'FUNDED' | 'DISBURSED' | 'CLOSED' | 'REJECTED';

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

/** Public trust signals derived from existing verification/school data. */
export interface CampaignTrust {
  admissionVerified: boolean;
  schoolConfirmed: boolean;
  identityChecked: boolean;
}

/** Public payout proof, present only for DISBURSED campaigns with a payout record. */
export interface PayoutProof {
  schoolName: string;
  amountCents: number;
  reference: string;
  status: PayoutStatus;
  sentAt?: string | null;
}

export interface CampaignDetail extends CampaignCard {
  story: string;
  /** Optional pitch video as an embeddable YouTube/Vimeo link. */
  videoUrl?: string | null;
  recommendation?: string | null;
  deadline?: string | null;
  tipsCents: number;
  school: School;
  donorCount: number;
  recentDonations: PublicDonation[];
  updates: CampaignUpdate[];
  trust: CampaignTrust;
  payoutProof?: PayoutProof | null;
  /** Public corporate recognition (named scholarships + logos). E5. */
  recognition?: CampaignRecognition[];
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
  storyBackground?: string | null;
  storyChallenge?: string | null;
  storyVision?: string | null;
  videoUrl?: string | null;
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
  /** Present when a card pledge reached the goal and was captured all-or-nothing. */
  capture?: { capturedIds: string[]; failedIds: string[]; capturedCents: number };
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

// ---- E4: Donor Retention ----

export type NotificationType =
  | 'THANK_YOU'
  | 'MILESTONE'
  | 'IMPACT_UPDATE'
  | 'GOAL_REACHED'
  | 'RECURRING_CHARGE';

export type TributeType = 'HONOR' | 'MEMORY';
export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface DonorNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  campaignId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: DonorNotification[];
  unread: number;
}

export interface DonorSummary {
  totalDonatedCents: number;
  donationCount: number;
  campaignsSupported: number;
  repeatDonor: boolean;
  activeRecurringCount: number;
}

export interface DonorDonation {
  id: string;
  campaignId: string;
  campaignTitle: string;
  schoolName: string;
  amountCents: number;
  currency: string;
  status: string;
  method: 'CARD' | 'SEPA';
  tribute?: string | null;
  anonymous: boolean;
  recurring: boolean;
  createdAt: string;
}

export interface DonorHistory {
  summary: DonorSummary;
  donations: DonorDonation[];
}

export interface RecurringPledge {
  id: string;
  campaignId: string;
  amountCents: number;
  currency: string;
  status: RecurringStatus;
  chargesCount: number;
  totalChargedCents: number;
  nextRunAt: string;
  lastChargedAt?: string | null;
  createdAt: string;
  campaign?: { title: string; studentProfile?: { fullName: string } | null };
}

export interface RecurringRunResult {
  charged: { pledgeId: string; donationId: string; amountCents: number }[];
  failed: string[];
  cancelled: string[];
}

export interface SubscriptionItem {
  campaignId: string;
  campaignTitle: string;
  createdAt: string;
}

// ---- E5: Corporate Channel ----

export type SponsorshipTier = 'SEMESTER' | 'YEAR' | 'FULL' | 'CUSTOM';
export type RecognitionKind = 'ANONYMOUS' | 'LOGO' | 'NAMED';
export type InvoiceDocType = 'DONATION' | 'SPONSORING';
export type InvoiceStatus = 'ISSUED' | 'PENDING' | 'PAID';

export interface GiftTier {
  tier: SponsorshipTier;
  label: string;
  amountCents: number;
  highlight?: boolean;
}

export interface CampaignRecognition {
  companyName: string;
  logoUrl?: string | null;
  scholarshipName?: string | null;
}

export interface CorporateInvoice {
  invoiceNo: string;
  documentType: InvoiceDocType;
  netCents: number;
  vatCents: number;
  grossCents: number;
  currency: string;
  vatId?: string | null;
  poNumber?: string | null;
  status: InvoiceStatus;
  settledAt?: string | null;
  issuedAt?: string;
  companyName?: string;
  campaignTitle?: string;
  schoolName?: string;
  issuer?: string;
}

export interface SponsorBody {
  tier: SponsorshipTier;
  amountCents?: number;
  method: 'CARD' | 'SEPA';
  scholarshipName?: string;
  logoRecognition?: boolean;
  impactReportOptIn?: boolean;
  poNumber?: string;
  vatId?: string;
  message?: string;
}

export interface CorporateSponsorshipResult {
  donation: { id: string; amountCents: number; status: string };
  campaign: {
    id: string;
    status: CampaignStatus;
    goalCents: number;
    raisedCents: number;
    tipsCents: number;
    currency: string;
    percent: number;
  };
  sponsorship: {
    id: string;
    tier: SponsorshipTier;
    fullTuition: boolean;
    scholarshipName?: string | null;
    logoRecognition: boolean;
    recognitionKind: RecognitionKind;
  };
  invoice: CorporateInvoice;
  capture?: { capturedIds: string[]; failedIds: string[]; capturedCents: number };
}

export interface EsgMetrics {
  studentsSupported: number;
  countriesReached: number;
  schoolsSupported: number;
  totalCommittedCents: number;
  fullScholarships: number;
  namedScholarships: number;
}

export interface EsgRow {
  campaignTitle: string;
  studentName: string;
  studentCountry: string;
  schoolName: string;
  amountCents: number;
  tier: SponsorshipTier;
  scholarshipName?: string | null;
  fullTuition: boolean;
  recognitionKind: RecognitionKind;
  createdAt: string;
}

export interface EsgDashboard {
  companyName: string;
  metrics: EsgMetrics;
  rows: EsgRow[];
}
