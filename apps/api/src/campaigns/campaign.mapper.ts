import {
  AdmissionVerification,
  Campaign,
  CampaignUpdate,
  Donation,
  Payout,
  School,
  StudentProfile,
} from '@prisma/client';
import { SponsorshipForRecognition, toRecognition } from './recognition.util';

/** Statuses that may appear publicly (always combined with a VERIFIED admission). */
export const VISIBLE_STATUSES = ['LIVE', 'FUNDED', 'DISBURSED'] as const;

export function percentOf(raisedCents: number, goalCents: number): number {
  if (goalCents <= 0) return 0;
  return Math.min(100, Math.round((raisedCents / goalCents) * 100));
}

type CampaignWithBasics = Campaign & {
  studentProfile: StudentProfile;
  school: School;
  verification?: AdmissionVerification | null;
};

type DonationWithCorp = Donation & {
  corporateProfile?: { companyName: string } | null;
};

type CampaignFull = CampaignWithBasics & {
  donations: DonationWithCorp[];
  updates: CampaignUpdate[];
  payout?: Payout | null;
  sponsorships?: SponsorshipForRecognition[];
};

/** Public trust signals derived from existing verification/school data. */
export function toTrust(c: CampaignWithBasics) {
  const admissionVerified = c.verification?.status === 'VERIFIED';
  return {
    admissionVerified,
    schoolConfirmed: c.school.payoutVerified,
    // Prototype: identity check is symbolically derived from a verified admission.
    identityChecked: admissionVerified,
  };
}

/** Public payout proof, only for disbursed campaigns that have a payout record. */
export function toPayoutProof(c: CampaignFull) {
  if (c.status !== 'DISBURSED' || !c.payout) return null;
  return {
    schoolName: c.school.name,
    amountCents: c.payout.amountCents,
    reference: c.payout.reference,
    status: c.payout.status,
    sentAt: c.payout.sentAt,
  };
}

export function toCard(c: CampaignWithBasics) {
  return {
    id: c.id,
    title: c.title,
    programName: c.programName,
    studentName: c.studentProfile.fullName,
    studentCountry: c.studentProfile.country,
    photoUrl: c.studentProfile.photoUrl,
    schoolId: c.schoolId,
    schoolName: c.school.name,
    schoolCountry: c.school.country,
    goalCents: c.goalCents,
    raisedCents: c.raisedCents,
    currency: c.currency,
    status: c.status,
    percent: percentOf(c.raisedCents, c.goalCents),
    verified: c.verification?.status === 'VERIFIED',
  };
}

export function toPublicDonation(d: DonationWithCorp) {
  const name = d.anonymous
    ? 'Anonymous'
    : (d.corporateProfile?.companyName ?? d.donorName ?? 'Donor');
  return {
    id: d.id,
    donorName: name,
    amountCents: d.amountCents,
    message: d.message,
    type: d.type,
    createdAt: d.createdAt,
  };
}

export function toDetail(c: CampaignFull) {
  const succeeded = c.donations.filter((d) => d.status === 'SUCCEEDED');
  return {
    ...toCard(c),
    story: c.story,
    videoUrl: c.videoUrl,
    recommendation: c.studentProfile.recommendation,
    deadline: c.deadline,
    tipsCents: c.tipsCents,
    school: {
      id: c.school.id,
      name: c.school.name,
      country: c.school.country,
      city: c.school.city,
      website: c.school.website,
      logoUrl: c.school.logoUrl,
    },
    donorCount: succeeded.length,
    recentDonations: succeeded.slice(0, 10).map(toPublicDonation),
    updates: c.updates.map((u) => ({
      id: u.id,
      title: u.title,
      body: u.body,
      type: u.type,
      createdAt: u.createdAt,
    })),
    trust: toTrust(c),
    payoutProof: toPayoutProof(c),
    recognition: toRecognition(c.sponsorships),
  };
}
