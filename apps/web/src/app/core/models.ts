// API response models for Bursa (mirror specs/001-bursa-funding-platform/contracts/api.md).

export type Role = 'STUDENT' | 'DONOR' | 'SPONSOR' | 'ADMIN' | 'SCHOOL_ADMIN';

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
  'THANK_YOU' | 'MILESTONE' | 'IMPACT_UPDATE' | 'GOAL_REACHED' | 'RECURRING_CHARGE';

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

// ---- E13: Employer Matching ----

export type MatchLocale = 'en' | 'de' | 'fr' | 'es';
export type MatchClaimStatus =
  'DETECTED' | 'OFFERED' | 'CLAIMED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type EmployerIntegrationLevel = 'AUTO_SUBMIT' | 'PORTAL' | 'MANUAL';

export interface MatchOfferLabels {
  headline: string;
  cta: string;
  balance: string;
}

export interface MatchOffer {
  eligible: boolean;
  employerName?: string;
  domain?: string;
  matchRatio?: number;
  matchCents?: number;
  remainingAnnualCents?: number;
  annualCapCents?: number;
  integrationLevel?: EmployerIntegrationLevel;
  capped?: boolean;
  labels: MatchOfferLabels;
}

export interface MatchClaimResult {
  id: string;
  status: MatchClaimStatus;
  statusLabel: string;
  employerName: string;
  matchCents: number;
  campaignId: string;
  applyUrl?: string;
  hasPdf: boolean;
  documentUrl?: string;
  remainingAnnualCents?: number;
  labels: { headline: string; status: string };
}

export interface MatchBalanceClaim {
  id: string;
  employerName: string;
  matchCents: number;
  status: MatchClaimStatus;
  statusLabel: string;
  campaignTitle: string;
  schoolName: string;
  createdAt: string;
}

export interface MatchBalance {
  employerName?: string;
  domain?: string;
  year: number;
  annualCapCents?: number;
  usedCents: number;
  remainingAnnualCents?: number;
  claims: MatchBalanceClaim[];
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

// ---- ESG / CSRD compliance reporting (E14) ----

export type ReportStandard = 'GRI_2024' | 'CSRD_ESRS' | 'SASB' | 'UN_SDG';

export interface CsrdMetric {
  code: string;
  label: string;
  value: number;
  unit: string;
  note: string;
}

export interface CsrdAnnotation {
  ref: number;
  sequence: number;
  entryType: string;
  amountCents: number;
  reason: string;
  entryHash: string;
}

export interface CsrdReportView {
  standard: ReportStandard;
  period: { start: string; end: string };
  metrics: CsrdMetric[];
  annotations: CsrdAnnotation[];
}

export interface CsrdReportSummary {
  id: string;
  standard: ReportStandard;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface DataQualityField {
  field: string;
  captured: number;
  total: number;
  pct: number;
  collectMore: boolean;
}

export interface DataQualityReport {
  fields: DataQualityField[];
  overallPct: number;
}

export interface TrendYear {
  year: number;
  investedEur: number;
  scholarCount: number;
  femaleSharePct: number;
}

export interface TrendDelta {
  year: number;
  investedEurDelta: number;
  scholarCountDelta: number;
  femaleShareDeltaPct: number;
}

export interface TrendReport {
  years: TrendYear[];
  deltas: TrendDelta[];
}

export type AuditorGrantStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface AuditorGrant {
  id: string;
  label: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  status: AuditorGrantStatus;
}

export interface CreatedAuditorGrant {
  id: string;
  label: string;
  token: string;
  expiresAt: string;
  portalUrl: string;
}

// ---- Observability & funnel analytics (E7) ----

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  conversionPct: number;
  dropOffPct: number;
}

export interface FunnelReport {
  steps: FunnelStep[];
  overallConversionPct: number;
}

export interface ObsFunnel {
  donation: FunnelReport;
  onboarding: FunnelReport;
}

export interface ObsMetrics {
  totalRequests: number;
  errorCount: number;
  errorRatePct: number;
  p50Ms: number;
  p95Ms: number;
  paymentTotal: number;
  paymentFailed: number;
  paymentFailureRatePct: number;
}

export interface SloWindow {
  windowLabel: string;
  sliPct: number;
  burnRate: number;
  budgetConsumedPct: number;
}

export interface SloReport {
  objectivePct: number;
  errorBudgetPct: number;
  windows: SloWindow[];
  alert: 'none' | 'ticket' | 'page';
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PaymentAlert {
  kind: string;
  severity: AlertSeverity;
  message: string;
  value: number;
}

export interface PaymentAlerts {
  alerts: PaymentAlert[];
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  checks: { db: boolean };
}

// ---- E8: School Self-Serve Portal & Partner Onboarding ----

export type SchoolOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ACTIVE';
export type StudentPayoutStatus = 'NONE' | 'AWAITING_FUNDING' | 'READY' | 'SENT' | 'CONFIRMED';

export interface SchoolProfile {
  id: string;
  name: string;
  country: string;
  city?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  slug?: string | null;
  onboardingStatus: SchoolOnboardingStatus;
  payoutVerified: boolean;
  bankAccountName?: string | null;
  ibanMasked?: string | null;
  bic?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
}

export interface OnboardingChecklistStep {
  key: string;
  label: string;
  done: boolean;
}

export interface SchoolPortalProfile {
  school: SchoolProfile;
  onboarding: {
    status: SchoolOnboardingStatus;
    progressPct: number;
    checklist: OnboardingChecklistStep[];
    agreementSignedAt?: string | null;
    agreementSignerName?: string | null;
  };
}

export interface PayoutFormBody {
  bankAccountName: string;
  iban: string;
  bic?: string;
  taxId: string;
  contactName: string;
  contactEmail: string;
}

export interface AdmissionRecord {
  id: string;
  schoolId: string;
  studentEmail: string;
  studentName: string;
  programName: string;
  admissionRef: string;
  status: VerificationStatus;
  note?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface AdmissionImportResult {
  imported: number;
  duplicates: number;
  errors: { line: number; message: string }[];
}

export interface SchoolDashboardStudent {
  campaignId: string;
  studentName: string;
  title: string;
  goalCents: number;
  raisedCents: number;
  progressPct: number;
  payoutStatus: StudentPayoutStatus;
}

export interface SchoolDashboard {
  totals: {
    totalStudents: number;
    liveCampaigns: number;
    fundedCampaigns: number;
    totalGoalCents: number;
    totalRaisedCents: number;
    totalPaidOutCents: number;
    pendingPayoutCents: number;
  };
  students: SchoolDashboardStudent[];
  donorGeography: { country: string; donationCount: number; amountCents: number }[];
}

export interface SchoolCampaignForApproval {
  id: string;
  title: string;
  programName: string;
  goalCents: number;
  status: CampaignStatus;
  createdAt: string;
  studentProfile?: { fullName: string; country: string } | null;
  verification?: { status: VerificationStatus } | null;
}

export interface SchoolWebhookLogItem {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  createdAt: string;
}

export interface OnboardingTokenState {
  schoolId: string;
  schoolName: string;
  country: string;
  onboardingStatus: SchoolOnboardingStatus;
}

export interface OnboardingCompleteResult {
  schoolId: string;
  schoolName: string;
  onboardingStatus: SchoolOnboardingStatus;
}

// ---- E9: Trust-and-Safety Operations Console ----

export type TrustRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ModerationStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
export type ChargebackStatus = 'OPEN' | 'EVIDENCE_SUBMITTED' | 'REFUND_OFFERED' | 'WON' | 'LOST';
export type FlagReason = 'SCAM' | 'DUPLICATE' | 'INAPPROPRIATE' | 'MISLEADING' | 'OTHER';
export type FlagStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED';
export type ModerationAction = 'APPROVE' | 'REJECT' | 'ESCALATE';

export interface ModerationCaseItem {
  id: string;
  campaignId: string;
  campaignTitle: string | null;
  campaignFrozen?: boolean;
  status: ModerationStatus;
  riskScore: number;
  riskLevel: TrustRiskLevel;
  reasons: string[];
  autoFlagged: boolean;
  decisionNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ChargebackItem {
  id: string;
  providerEventId: string;
  campaignId?: string | null;
  donationId?: string | null;
  amountCents: number;
  currency: string;
  reason: string;
  status: ChargebackStatus;
  evidenceNote?: string | null;
  refundOffered: boolean;
  createdAt: string;
}

export interface FraudSignalItem {
  id: string;
  kind: string;
  score: number;
  riskLevel: TrustRiskLevel;
  reasons: string[];
  donorUserId?: string | null;
  campaignId?: string | null;
  createdAt: string;
}

export interface CampaignFlagItem {
  id: string;
  campaignId: string;
  reason: FlagReason;
  note?: string | null;
  status: FlagStatus;
  reporterUserId?: string | null;
  visitorId?: string | null;
  createdAt: string;
}

export interface TrustCountRow {
  key: string;
  count: number;
}

export interface TrustTrendPoint {
  date: string;
  count: number;
}

export interface TrustDashboardData {
  fraud: {
    totalSignals: number;
    highRiskSignals: number;
    byKind: TrustCountRow[];
    trend: TrustTrendPoint[];
  };
  chargebacks: {
    open: number;
    total: number;
    chargebackRatePct: number;
    refundOffered: number;
    byStatus: TrustCountRow[];
  };
  moderation: {
    backlog: number;
    openCases: number;
    escalated: number;
    byLevel: TrustCountRow[];
  };
  flags: {
    open: number;
    total: number;
    byReason: TrustCountRow[];
  };
  frozen: {
    campaigns: number;
    donors: number;
  };
}

export interface HeatMapRowItem {
  country: string;
  donationCount: number;
  signalCount: number;
  chargebackCount: number;
  riskScore: number;
  riskLevel: TrustRiskLevel;
}

export interface TrustHeatMap {
  rows: HeatMapRowItem[];
}

export interface CreateFlagBody {
  reason: FlagReason;
  note?: string;
  visitorId?: string;
}

export interface ModerationDecisionBody {
  action: ModerationAction;
  note: string;
}

export interface CampaignFlagResult {
  id: string;
  status: FlagStatus;
}

// ---- E10: AI Fundraising Coach ----
export type CoachKind = 'TITLE' | 'STORY' | 'SHARE';
export type AiShareChannel = 'whatsapp' | 'email' | 'linkedin';
export type CoachLocale = 'de' | 'en';

export interface AiVariant {
  text: string;
  length: number;
  recommended: boolean;
}

export interface AiStoryParts {
  background: string;
  challenge: string;
  vision: string;
}

export interface AiStoryVariant extends AiVariant {
  parts: AiStoryParts;
}

export interface AiBudgetView {
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
  generations: number;
  exhausted: boolean;
}

export interface AiBudgetDelta {
  remainingTokens: number;
  exhausted: boolean;
}

export interface AiTitleResult {
  kind: 'TITLE';
  locale: CoachLocale;
  provider: string;
  variants: AiVariant[];
  recommendedIndex: number;
  budget: AiBudgetDelta;
}

export interface AiStoryResult {
  kind: 'STORY';
  locale: CoachLocale;
  provider: string;
  variants: AiStoryVariant[];
  recommendedIndex: number;
  budget: AiBudgetDelta;
}

export interface AiShareResult {
  kind: 'SHARE';
  channel: AiShareChannel;
  locale: CoachLocale;
  provider: string;
  variants: AiVariant[];
  recommendedIndex: number;
  budget: AiBudgetDelta;
}

// ---- E11: KYC & Verification Pipeline ----
export type VerificationSubject = 'STUDENT' | 'SPONSOR';

export type VerificationCaseStatus =
  | 'STARTED'
  | 'LIVENESS_PASSED'
  | 'DOCUMENT_VERIFIED'
  | 'AML_CLEARED'
  | 'VERIFIED'
  | 'MANUAL_REVIEW'
  | 'REJECTED';

export type ReviewQueueStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type KycRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AmlDecision = 'CLEAR' | 'HIT' | 'BLOCKED';

export interface VerificationCaseView {
  id: string;
  subjectType: VerificationSubject;
  status: VerificationCaseStatus;
  reviewQueueStatus: ReviewQueueStatus;
  riskScore: number;
  riskLevel: KycRiskLevel;
  decisionNote: string | null;
  liveness: { provider: string; confidence: number; passed: boolean } | null;
  document: {
    provider: string;
    extractedName: string;
    nameMatchScore: number;
    matched: boolean;
    registrarConfirmed: boolean;
  } | null;
  aml: {
    provider: string;
    amountCents: number;
    country: string;
    decision: AmlDecision;
    reasons: string[];
  } | null;
  createdAt: string;
}

export interface KycDashboardView {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
  riskDistribution: Record<KycRiskLevel, number>;
}

export interface StartCaseBody {
  admissionRecordId?: string;
}

export interface LivenessBody {
  livenessToken: string;
}

export interface DocumentBody {
  documentToken: string;
  claimedName: string;
}

export interface AmlScreenBody {
  amountCents: number;
  country: string;
}

export interface ReviewDecideBody {
  decision: 'APPROVE' | 'REJECT';
  note: string;
}

// ---- E12: Payout Reconciliation & Transparency ----

export type LedgerEntryType = 'DONATION' | 'PAYOUT' | 'DISBURSEMENT';

export type ReconciliationRowStatus = 'MATCHED' | 'PENDING' | 'UNMATCHED' | 'DISCREPANCY';

export interface BankTxView {
  externalId: string;
  amountCents: number;
  currency: string;
  reference: string | null;
  postedAt: string;
}

export interface PayoutRowView {
  payoutId: string;
  campaignTitle: string;
  amountCents: number;
  currency: string;
  payoutStatus: 'PENDING' | 'SENT' | 'CONFIRMED';
  reconciliationStatus: ReconciliationRowStatus;
  bankTx: BankTxView | null;
  discrepancyCents: number | null;
  sentAt: string | null;
}

export interface StaleAlertView {
  payoutId: string;
  amountCents: number;
  hoursStale: number;
  campaignTitle: string;
}

export interface ReconciliationView {
  schoolId: string;
  runAt: string;
  summary: {
    matchedCount: number;
    pendingCount: number;
    unmatchedCount: number;
    discrepancyCount: number;
    bankTxCount: number;
  };
  rows: PayoutRowView[];
  unmatchedBankTx: BankTxView[];
  alerts: StaleAlertView[];
}

export interface LedgerEntryView {
  sequence: number;
  entryType: LedgerEntryType;
  amountCents: number;
  currency: string;
  reason: string;
  refType: string | null;
  refId: string | null;
  entryHash: string;
  createdAt: string;
}

export interface LedgerView {
  schoolId: string;
  integrity: {
    valid: boolean;
    checkedCount: number;
    brokenAtSequence: number | null;
  };
  entries: LedgerEntryView[];
}

export interface TransparencyView {
  schoolId: string;
  schoolName: string;
  totalRaisedCents: number;
  totalPaidOutCents: number;
  donationCount: number;
  avgDonationCents: number;
  studentsSupported: number;
  donorGeography: {
    country: string;
    donationCount: number;
    amountCents: number;
  }[];
}
