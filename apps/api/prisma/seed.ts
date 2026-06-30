import {
  EsgCategory,
  Gender,
  LedgerEntryType,
  Prisma,
  PrismaClient,
  ReportStandard,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildLedgerEntry,
  genesisPosition,
  MovementInput,
  nextPosition,
} from '../src/ledger/ledger-entry';
import { createOnboardingToken } from '../src/schools/onboarding-token';
import { createReferralCode } from '../src/referral/referral-code.util';
import { EMPLOYER_PROGRAMS } from '../src/matching/employer-programs.data';
import { buildEsgAggregate } from '../src/esg/esg-aggregate';
import { mapToStandard } from '../src/esg/esg-standard-mapper';
import { buildAnnotations } from '../src/esg/audit-annotation';
import { createAuditorToken } from '../src/esg/auditor-access-token';

const prisma = new PrismaClient();

const SEED_IMAGE_DIR = path.resolve(__dirname, '../../web/public/seed');
const OPENAI_ENV_FALLBACK =
  '/Users/dennisvocke/Library/CloudStorage/OneDrive-slicedelephantdpvGmbH/Dokumente - sliced elephant/SE_Company/06_IT/.env';

const PASSWORD = 'bursa1234';

// ----------------------------------------------------------------------------
// OpenAI DALL·E portrait generation (synthetic faces; falls back to null)
// ----------------------------------------------------------------------------

function readOpenAiKey(): string | null {
  if (process.env.OPENAI_KEY) return process.env.OPENAI_KEY;
  try {
    const content = fs.readFileSync(OPENAI_ENV_FALLBACK, 'utf8');
    const match = content.match(/^\s*OPENAI_KEY\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    /* ignore */
  }
  return null;
}

const OPENAI_KEY = readOpenAiKey();

async function generatePortrait(
  prompt: string,
  slug: string,
): Promise<string | null> {
  const outPath = path.join(SEED_IMAGE_DIR, `${slug}.png`);
  const servedPath = `/seed/${slug}.png`;

  // The 11 portraits are committed in the repo and served by the web app at
  // /seed/<slug>.png. The photoUrl always points there. We only (re)generate a
  // file when it is missing locally AND a key is available (best effort) — e.g.
  // to add a new student. In a container deploy the API has no web/ dir, so we
  // skip generation and just reference the served path.
  if (!fs.existsSync(outPath) && OPENAI_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          size: '1024x1024',
          quality: 'medium',
          n: 1,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { b64_json?: string }[] };
        const b64 = json.data?.[0]?.b64_json;
        if (b64) {
          fs.mkdirSync(SEED_IMAGE_DIR, { recursive: true });
          fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
          console.log(`  ✓ portrait ${slug}.png`);
        }
      } else {
        console.warn(`  image gen failed for ${slug}: ${res.status}`);
      }
    } catch (e) {
      console.warn(`  image error for ${slug}:`, (e as Error).message);
    }
  }

  return servedPath;
}

// ----------------------------------------------------------------------------
// Seed data
// ----------------------------------------------------------------------------

const eur = (n: number) => Math.round(n * 100);

interface DonationSeed {
  name: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}

interface StudentSeed {
  slug: string;
  email?: string; // set for the demo login account
  fullName: string;
  gender: 'man' | 'woman';
  country: string;
  school: string; // key
  program: string;
  title: string;
  goal: number; // euros
  status: 'LIVE' | 'FUNDED' | 'DISBURSED' | 'PENDING';
  story: string;
  /** Optional pitch video as an embeddable YouTube/Vimeo link (no upload). */
  video?: string;
  recommendation?: string;
  donations: DonationSeed[];
}

const SCHOOLS = [
  {
    key: 'esmt',
    name: 'ESMT Berlin',
    country: 'Germany',
    city: 'Berlin',
    website: 'https://esmt.berlin',
    verified: true,
  },
  {
    key: 'insead',
    name: 'INSEAD',
    country: 'France',
    city: 'Fontainebleau',
    website: 'https://insead.edu',
    verified: true,
  },
  {
    key: 'ie',
    name: 'IE Business School',
    country: 'Spain',
    city: 'Madrid',
    website: 'https://ie.edu',
    verified: true,
  },
  {
    key: 'rsm',
    name: 'Rotterdam School of Management',
    country: 'Netherlands',
    city: 'Rotterdam',
    website: 'https://rsm.nl',
    verified: false,
  },
];

const STUDENTS: StudentSeed[] = [
  {
    slug: 'amara-okonkwo',
    email: 'amara@bursa.test',
    fullName: 'Amara Okonkwo',
    gender: 'woman',
    country: 'Nigeria',
    school: 'esmt',
    program: 'Full-Time MBA 2026',
    title: 'From Lagos fintech to a Berlin MBA',
    goal: 42000,
    status: 'LIVE',
    video: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    story:
      'I built and scaled a mobile payments team in Lagos serving 200,000 users. ESMT Berlin admitted me to their Full-Time MBA, but the naira devaluation pushed the tuition far beyond what my savings can cover. With your help, I will bring operational experience back to West Africa and mentor the next wave of founders.',
    recommendation:
      '"Amara is one of the most resourceful operators I have worked with." — former CTO, Lagos fintech',
    donations: [
      { name: 'Helena R.', amount: 250, message: 'Go get it, Amara!' },
      { name: 'Marcus T.', amount: 500 },
      { name: 'Anonymous', amount: 1000, anonymous: true },
      { name: 'Ada N.', amount: 15000, message: 'So proud of you.' },
    ],
  },
  {
    slug: 'kwame-mensah',
    fullName: 'Kwame Mensah',
    gender: 'man',
    country: 'Ghana',
    school: 'insead',
    program: 'MBA 2026 January Intake',
    title: 'Healthcare logistics for rural Ghana',
    goal: 95000,
    status: 'LIVE',
    video: 'https://vimeo.com/76979871',
    story:
      'I spent five years moving medicines to clinics no truck wanted to reach. INSEAD gave me a seat; the deposit alone is more than my annual salary. An MBA lets me turn a scrappy operation into a company that keeps rural pharmacies stocked.',
    recommendation:
      '"Kwame solves problems most people walk away from." — Regional health director',
    donations: [
      { name: 'Sofia L.', amount: 2000 },
      { name: 'James P.', amount: 5000, message: 'Healthcare access matters.' },
      { name: 'Anonymous', amount: 8000, anonymous: true },
    ],
  },
  {
    slug: 'thandiwe-ncube',
    fullName: 'Thandiwe Ncube',
    gender: 'woman',
    country: 'Zimbabwe',
    school: 'ie',
    program: 'International MBA 2026',
    title: 'Solar microgrids for Southern Africa',
    goal: 58000,
    status: 'LIVE',
    video: 'https://youtu.be/aqz-KE-bpKQ',
    story:
      'I co-founded a solar microgrid pilot that now powers three villages. IE Business School admitted me to scale this into a regional energy company. The tuition gap is the only thing standing between me and that classroom in Madrid.',
    recommendation:
      '"A natural systems-thinker and a relentless builder." — Engineering mentor',
    donations: [
      {
        name: 'Green Future e.V.',
        amount: 6000,
        message: 'Powering the future.',
      },
      { name: 'Lena K.', amount: 750 },
    ],
  },
  {
    slug: 'aisha-bello',
    fullName: 'Aisha Bello',
    gender: 'woman',
    country: 'Nigeria',
    school: 'esmt',
    program: 'Full-Time MBA 2026',
    title: 'Closing the SME credit gap',
    goal: 40000,
    status: 'LIVE',
    story:
      'I underwrote loans for small traders who banks ignored, with a default rate below 4%. ESMT Berlin offered me a partial scholarship; I am raising the remainder so I can build a credit company for African SMEs.',
    donations: [
      { name: 'Tobias M.', amount: 1200 },
      { name: 'Anonymous', amount: 3000, anonymous: true },
    ],
  },
  {
    slug: 'joseph-mwangi',
    fullName: 'Joseph Mwangi',
    gender: 'man',
    country: 'Kenya',
    school: 'insead',
    program: 'MBA 2026',
    title: 'Agritech for smallholder farmers',
    goal: 90000,
    status: 'LIVE',
    story:
      'My platform connects 12,000 smallholder farmers to buyers and fair prices. INSEAD admitted me to sharpen the business model. I am the first in my family to finish university; this MBA would be a first too.',
    donations: [
      { name: 'Clara V.', amount: 4000, message: 'Feed the future!' },
    ],
  },
  {
    slug: 'priya-sharma',
    fullName: 'Priya Sharma',
    gender: 'woman',
    country: 'Nepal',
    school: 'ie',
    program: 'International MBA 2026',
    title: 'Tourism that pays Himalayan communities',
    goal: 55000,
    status: 'LIVE',
    story:
      'I run a community tourism cooperative that keeps revenue in mountain villages instead of foreign tour operators. IE Business School admitted me to grow it responsibly across the region.',
    donations: [
      { name: 'Anonymous', amount: 2500, anonymous: true },
      {
        name: 'Robert H.',
        amount: 1500,
        message: 'I trekked there once — beautiful work.',
      },
    ],
  },
  {
    slug: 'grace-achieng',
    fullName: 'Grace Achieng',
    gender: 'woman',
    country: 'Kenya',
    school: 'esmt',
    program: 'Full-Time MBA 2026',
    title: 'Affordable diagnostics for clinics',
    goal: 41000,
    status: 'LIVE',
    story:
      'I led a team that cut diagnostic test costs by 60% for community clinics. ESMT Berlin admitted me to turn that into a scalable medical-device venture.',
    donations: [
      { name: 'MedAccess Group', amount: 9000, message: 'Health is wealth.' },
    ],
  },
  {
    slug: 'tenzin-dorji',
    fullName: 'Tenzin Dorji',
    gender: 'man',
    country: 'Bhutan',
    school: 'insead',
    program: 'MBA 2026',
    title: 'Bringing Bhutan’s startups to the world',
    goal: 88000,
    status: 'FUNDED',
    story:
      'I built Bhutan’s first startup incubator. INSEAD admitted me to learn how to connect Himalayan founders to global capital. Thanks to an extraordinary community, this campaign is fully funded — tuition will be paid directly to INSEAD.',
    recommendation:
      '"Tenzin is a once-in-a-generation connector." — Incubator board chair',
    donations: [
      {
        name: 'Acme Capital',
        amount: 60000,
        message: 'Backing exceptional talent.',
      },
      { name: 'Anonymous', amount: 28000, anonymous: true },
    ],
  },
  {
    slug: 'maria-santos',
    fullName: 'Maria Santos',
    gender: 'woman',
    country: 'Bolivia',
    school: 'ie',
    program: 'International MBA 2026',
    title: 'Fair-trade textiles, scaled',
    goal: 52000,
    status: 'FUNDED',
    story:
      'I grew a fair-trade textile cooperative from 8 to 140 weavers. IE Business School admitted me to build the brand internationally. This campaign reached its goal — the funds go straight to IE.',
    donations: [
      {
        name: 'Acme Capital',
        amount: 30000,
        message: 'Sustainable business, funded.',
      },
      { name: 'Isabella F.', amount: 12000 },
      { name: 'Anonymous', amount: 10000, anonymous: true },
    ],
  },
  {
    slug: 'samuel-osei',
    fullName: 'Samuel Osei',
    gender: 'man',
    country: 'Ghana',
    school: 'esmt',
    program: 'Full-Time MBA 2025',
    title: 'EdTech for West African classrooms',
    goal: 39000,
    status: 'DISBURSED',
    story:
      'My offline-first learning app reached 80,000 students without reliable internet. ESMT Berlin tuition has been paid in full and directly to the school — I am now enrolled and building what comes next.',
    recommendation: '"Samuel ships. Then he ships more." — Lead teacher, Accra',
    donations: [
      {
        name: 'Learning Forward Fund',
        amount: 25000,
        message: 'Education changes everything.',
      },
      { name: 'Anonymous', amount: 14000, anonymous: true },
    ],
  },
  {
    slug: 'fatima-diallo',
    fullName: 'Fatima Diallo',
    gender: 'woman',
    country: 'Senegal',
    school: 'insead',
    program: 'MBA 2026',
    title: 'Clean water as a business, not charity',
    goal: 92000,
    status: 'PENDING',
    story:
      'I run water kiosks that serve 40,000 people on a sustainable model. INSEAD admitted me to scale across West Africa. My admission is awaiting verification on Bursa.',
    donations: [],
  },
];

// ----------------------------------------------------------------------------
// Seeding
// ----------------------------------------------------------------------------

async function clearDatabase(): Promise<void> {
  // E17 (delete before campaign/user — student voices, channel prefs, feed reads)
  await prisma.studentMessage.deleteMany();
  await prisma.notificationChannelPref.deleteMany();
  await prisma.feedRead.deleteMany();
  // E15 (delete before donation/campaign/user — referral attribution + links)
  await prisma.referralAttribution.deleteMany();
  await prisma.advocateInvite.deleteMany();
  await prisma.referralLink.deleteMany();
  // E14 (delete before ledgerEntry/user: EsgTag references a ledger entry)
  await prisma.esgTag.deleteMany();
  await prisma.esgReport.deleteMany();
  await prisma.auditorAccessGrant.deleteMany();
  // E13 (delete before donation/user/campaign: claim references donation + program)
  await prisma.matchClaim.deleteMany();
  await prisma.employerMatchProgram.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.corporateSponsorship.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.updateSubscription.deleteMany();
  await prisma.campaignUpdate.deleteMany();
  // E12 (delete before payout: bank tx references the payout via matchedPayoutId)
  await prisma.bankTransaction.deleteMany();
  await prisma.reconciliation.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payout.deleteMany();
  // E11 (delete step children before the case, case before user/admission)
  await prisma.livenessResult.deleteMany();
  await prisma.documentVerification.deleteMany();
  await prisma.amlScreening.deleteMany();
  await prisma.verificationCase.deleteMany();
  // E10 (delete before user — cascade off User, but explicit for clarity)
  await prisma.aiGeneration.deleteMany();
  await prisma.aiTokenBudget.deleteMany();
  // E9 (delete before campaign/donation/user — soft refs + campaign cascade)
  await prisma.fraudSignal.deleteMany();
  await prisma.chargeback.deleteMany();
  await prisma.campaignFlag.deleteMany();
  await prisma.moderationCase.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.recurringPledge.deleteMany();
  await prisma.admissionVerification.deleteMany();
  // E8 (delete before campaign/school/user)
  await prisma.schoolWebhookEvent.deleteMany();
  await prisma.schoolOnboardingToken.deleteMany();
  await prisma.admissionRecord.deleteMany();
  await prisma.schoolAdmin.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.corporateProfile.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
}

// E8: deterministic donor-country attribution for the school dashboard geography.
const DONOR_COUNTRIES = [
  'Germany',
  'United States',
  'United Kingdom',
  'France',
  'Nigeria',
  'Kenya',
];
function donorCountryFor(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return DONOR_COUNTRIES[sum % DONOR_COUNTRIES.length];
}

async function main(): Promise<void> {
  console.log('Seeding Bursa…');
  fs.mkdirSync(SEED_IMAGE_DIR, { recursive: true });
  if (!OPENAI_KEY) {
    console.warn(
      '! No OPENAI_KEY found — profile images fall back to initials avatars.',
    );
  }

  await clearDatabase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Schools
  const schoolByKey: Record<string, string> = {};
  for (const s of SCHOOLS) {
    const created = await prisma.school.create({
      data: {
        name: s.name,
        country: s.country,
        city: s.city,
        website: s.website,
        slug: s.key,
        payoutVerified: s.verified,
        payoutAccountRef: s.verified
          ? `DE89 3704 ${Math.floor(1000 + Math.random() * 8999)} ${s.key.toUpperCase()}`
          : null,
        // E8: verified schools are fully self-serve-onboarded (ACTIVE); the
        // unverified one (RSM) gets a hosted onboarding link below.
        onboardingStatus: s.verified ? 'ACTIVE' : 'NOT_STARTED',
        bankAccountName: s.verified ? `${s.name} gGmbH` : null,
        iban: s.verified ? 'DE89370400440532013000' : null,
        bic: s.verified ? 'COBADEFFXXX' : null,
        taxId: s.verified ? `DE-${s.key.toUpperCase()}-TAX` : null,
        contactName: s.verified ? 'School Bursar' : null,
        contactEmail: s.verified ? `bursar@${s.key}.test` : null,
        agreementSignedAt: s.verified ? new Date() : null,
        agreementSignerName: s.verified ? 'School Bursar' : null,
        agreementRef: s.verified ? `mock_esign_seed_${s.key}` : null,
      },
    });
    schoolByKey[s.key] = created.id;
  }
  console.log(`Created ${SCHOOLS.length} schools.`);

  // Platform users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bursa.test',
      passwordHash,
      displayName: 'Platform Admin',
      role: 'ADMIN',
    },
  });
  const donor = await prisma.user.create({
    data: {
      email: 'donor@bursa.test',
      passwordHash,
      displayName: 'Generous Donor',
      role: 'DONOR',
    },
  });
  const sponsorUser = await prisma.user.create({
    data: {
      email: 'sponsor@acme.test',
      passwordHash,
      displayName: 'Acme Capital',
      role: 'SPONSOR',
    },
  });
  const sponsorProfile = await prisma.corporateProfile.create({
    data: {
      userId: sponsorUser.id,
      companyName: 'Acme Capital',
      sector: 'Venture Capital',
      contactName: 'Jordan Reyes',
    },
  });

  // E8: a school-admin for ESMT Berlin (self-serve portal demo account).
  const schoolAdminUser = await prisma.user.create({
    data: {
      email: 'schooladmin@bursa.test',
      passwordHash,
      displayName: 'ESMT Berlin Admin',
      role: 'SCHOOL_ADMIN',
    },
  });
  await prisma.schoolAdmin.create({
    data: { userId: schoolAdminUser.id, schoolId: schoolByKey['esmt'] },
  });
  // Generate portraits (batched concurrency; one-off seed)
  console.log('Generating portraits…');
  const photoBySlug: Record<string, string | null> = {};
  const promptFor = (st: StudentSeed) =>
    `A warm, professional headshot portrait photograph of a ${st.gender} from ${st.country} in their late twenties, business-casual attire, soft neutral studio background, natural lighting, friendly confident expression, photorealistic, high quality. Fictional person.`;
  const BATCH = 4;
  for (let i = 0; i < STUDENTS.length; i += BATCH) {
    const batch = STUDENTS.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((st) => generatePortrait(promptFor(st), st.slug)),
    );
    batch.forEach((st, j) => {
      photoBySlug[st.slug] = results[j];
    });
  }

  // Students + campaigns
  let liveCount = 0;
  const campaignBySlug: Record<string, string> = {};
  const userIdBySlug: Record<string, string> = {};
  for (const st of STUDENTS) {
    const user = await prisma.user.create({
      data: {
        email: st.email ?? `${st.slug}@students.bursa.test`,
        passwordHash,
        displayName: st.fullName,
        role: 'STUDENT',
      },
    });
    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: st.fullName,
        country: st.country,
        story: st.story,
        recommendation: st.recommendation,
        photoUrl: photoBySlug[st.slug],
      },
    });

    const raisedCents = st.donations
      .filter(() => st.status !== 'PENDING')
      .reduce((sum, d) => sum + eur(d.amount), 0);

    const campaignStatus =
      st.status === 'PENDING' ? 'PENDING_VERIFICATION' : st.status;

    const campaign = await prisma.campaign.create({
      data: {
        studentProfileId: profile.id,
        schoolId: schoolByKey[st.school],
        programName: st.program,
        title: st.title,
        story: st.story,
        videoUrl: st.video ?? null,
        goalCents: eur(st.goal),
        raisedCents,
        status: campaignStatus,
      },
    });
    campaignBySlug[st.slug] = campaign.id;
    userIdBySlug[st.slug] = user.id;

    // Verification
    await prisma.admissionVerification.create({
      data: {
        campaignId: campaign.id,
        status: st.status === 'PENDING' ? 'PENDING' : 'VERIFIED',
        admissionRef: `ADM-${st.slug.toUpperCase()}`,
        verifiedById: st.status === 'PENDING' ? null : admin.id,
        verifiedAt: st.status === 'PENDING' ? null : new Date(),
        note:
          st.status === 'PENDING'
            ? null
            : 'Admission letter checked against school confirmation.',
      },
    });

    // Donations
    for (const d of st.donations) {
      const isAcme = d.name === 'Acme Capital';
      await prisma.donation.create({
        data: {
          campaignId: campaign.id,
          corporateProfileId: isAcme ? sponsorProfile.id : null,
          amountCents: eur(d.amount),
          method: isAcme ? 'SEPA' : 'CARD',
          type: isAcme ? 'CORPORATE' : 'PRIVATE',
          status: 'SUCCEEDED',
          providerRef: `mock_seed_${Math.random().toString(36).slice(2, 10)}`,
          message: d.message,
          anonymous: d.anonymous ?? false,
          donorName: d.anonymous ? null : d.name,
          donorCountry: donorCountryFor(d.name),
        },
      });
    }

    // Lifecycle updates
    if (st.status !== 'PENDING') {
      await prisma.campaignUpdate.create({
        data: {
          campaignId: campaign.id,
          title: 'Admission verified',
          body: 'This student’s admission has been verified. The campaign is now live.',
          type: 'SYSTEM',
        },
      });
    }
    if (st.status === 'FUNDED' || st.status === 'DISBURSED') {
      await prisma.campaignUpdate.create({
        data: {
          campaignId: campaign.id,
          title: 'Goal reached',
          body: 'This campaign reached its tuition goal. Thank you to every supporter!',
          type: 'SYSTEM',
        },
      });
    }

    // Payout for the disbursed campaign
    if (st.status === 'DISBURSED') {
      await prisma.payout.create({
        data: {
          campaignId: campaign.id,
          schoolId: schoolByKey[st.school],
          amountCents: raisedCents,
          method: 'SEPA',
          reference: `mock_payout_seed_${st.slug}`,
          status: 'CONFIRMED',
          proofNote: 'Tuition received by the school bursar.',
          sentAt: new Date(),
        },
      });
      await prisma.campaignUpdate.create({
        data: {
          campaignId: campaign.id,
          title: 'Funds disbursed to school',
          body: 'The raised tuition has been paid directly to the school. The student is enrolled.',
          type: 'SYSTEM',
        },
      });
    }

    if (campaignStatus === 'LIVE') liveCount += 1;
  }

  console.log(
    `Created ${STUDENTS.length} students/campaigns (${liveCount} live).`,
  );

  // E10 — AI Fundraising Coach: give the demo student a visible token budget so
  // the coach panel in the wizard shows remaining tokens out of the box. A
  // little usage is pre-recorded so the counter is non-zero.
  const amaraUserId = userIdBySlug['amara-okonkwo'];
  if (amaraUserId) {
    await prisma.aiTokenBudget.create({
      data: {
        userId: amaraUserId,
        limitTokens: 20000,
        usedTokens: 1200,
        generations: 3,
      },
    });
    await prisma.aiGeneration.createMany({
      data: [
        {
          userId: amaraUserId,
          kind: 'TITLE',
          locale: 'en',
          provider: 'mock',
          tokensCharged: 400,
          variantCount: 3,
        },
        {
          userId: amaraUserId,
          kind: 'STORY',
          locale: 'en',
          provider: 'mock',
          tokensCharged: 600,
          variantCount: 2,
        },
        {
          userId: amaraUserId,
          kind: 'SHARE',
          channel: 'whatsapp',
          locale: 'en',
          provider: 'mock',
          tokensCharged: 200,
          variantCount: 3,
        },
      ],
    });
    console.log(
      'Created E10 AI-coach demo data (token budget + generation log for amara).',
    );
  }

  // --------------------------------------------------------------------------
  // E4 — Donor Retention demo data for donor@bursa.test
  // (account history + tribute, subscriptions, a simulated recurring pledge,
  //  and an in-app/email notification feed)
  // --------------------------------------------------------------------------
  const amaraId = campaignBySlug['amara-okonkwo'];
  const kwameId = campaignBySlug['kwame-mensah'];

  // Two donor-attributed gifts, one dedicated "in honour of".
  await prisma.donation.create({
    data: {
      campaignId: amaraId,
      donorUserId: donor.id,
      amountCents: eur(150),
      method: 'CARD',
      type: 'PRIVATE',
      status: 'CAPTURED',
      providerRef: 'mock_seed_donor_amara',
      donorName: 'Generous Donor',
      tributeType: 'HONOR',
      tributeName: 'Professor Adeyemi',
      capturedAt: new Date(),
    },
  });
  await prisma.campaign.update({
    where: { id: amaraId },
    data: { raisedCents: { increment: eur(150) } },
  });

  await prisma.donation.create({
    data: {
      campaignId: kwameId,
      donorUserId: donor.id,
      amountCents: eur(80),
      method: 'CARD',
      type: 'PRIVATE',
      status: 'CAPTURED',
      providerRef: 'mock_seed_donor_kwame',
      donorName: 'Generous Donor',
      capturedAt: new Date(),
    },
  });
  await prisma.campaign.update({
    where: { id: kwameId },
    data: { raisedCents: { increment: eur(80) } },
  });

  // Update subscriptions for the two supported campaigns.
  await prisma.updateSubscription.createMany({
    data: [
      { donorUserId: donor.id, campaignId: amaraId },
      { donorUserId: donor.id, campaignId: kwameId },
    ],
  });

  // A simulated monthly pledge, due now so "Simulate next charge" works in the demo.
  await prisma.recurringPledge.create({
    data: {
      donorUserId: donor.id,
      campaignId: amaraId,
      amountCents: eur(25),
      currency: 'EUR',
      status: 'ACTIVE',
      nextRunAt: new Date(),
    },
  });

  // --------------------------------------------------------------------------
  // E16 — Donor Portfolio & Giving-Streaks demo data for donor@bursa.test.
  // Builds a multi-month, multi-student history so the portfolio shows a visible
  // streak (SILVER badge at 6+ months) and 5 supported students. Money still goes
  // to the school: these are normal CAPTURED donations on existing campaigns.
  // Idempotent via the full clearDatabase() reset at the top of main().
  // Anchor on the 15th to avoid day-of-month overflow (e.g. "Feb 31" rolling into
  // March), which would otherwise punch a hole in the consecutive-month streak.
  const monthsAgo = (n: number): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - n, 15, 12, 0, 0);
  };

  // A 7-month giving streak on Amara's campaign (months 0..6) -> SILVER badge.
  for (let i = 1; i <= 6; i += 1) {
    await prisma.donation.create({
      data: {
        campaignId: amaraId,
        donorUserId: donor.id,
        amountCents: eur(25),
        method: 'CARD',
        type: 'PRIVATE',
        status: 'CAPTURED',
        providerRef: `mock_seed_donor_streak_${i}`,
        donorName: 'Generous Donor',
        capturedAt: monthsAgo(i),
        createdAt: monthsAgo(i),
      },
    });
    await prisma.campaign.update({
      where: { id: amaraId },
      data: { raisedCents: { increment: eur(25) } },
    });
  }

  // Three more supported students across earlier months -> a 5-student portfolio
  // (Amara + Kwame from E4, plus Thandiwe, Aisha, Priya here).
  const portfolioGifts: Array<{ slug: string; eur: number; month: number }> = [
    { slug: 'thandiwe-ncube', eur: 60, month: 2 },
    { slug: 'aisha-bello', eur: 40, month: 4 },
    { slug: 'priya-sharma', eur: 35, month: 5 },
  ];
  for (const gift of portfolioGifts) {
    const campaignId = campaignBySlug[gift.slug];
    if (!campaignId) continue;
    await prisma.donation.create({
      data: {
        campaignId,
        donorUserId: donor.id,
        amountCents: eur(gift.eur),
        method: 'CARD',
        type: 'PRIVATE',
        status: 'CAPTURED',
        providerRef: `mock_seed_donor_portfolio_${gift.slug}`,
        donorName: 'Generous Donor',
        capturedAt: monthsAgo(gift.month),
        createdAt: monthsAgo(gift.month),
      },
    });
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { raisedCents: { increment: eur(gift.eur) } },
    });
  }

  // In-app feed + one logged email copy.
  await prisma.notification.createMany({
    data: [
      {
        userId: donor.id,
        type: 'THANK_YOU',
        channel: 'IN_APP',
        title: 'Thank you for your gift',
        body: "Your €150 gift toward Amara Okonkwo's tuition is on its way directly to the school.",
        campaignId: amaraId,
      },
      {
        userId: donor.id,
        type: 'IMPACT_UPDATE',
        channel: 'IN_APP',
        title: 'Update from Kwame Mensah: Admission verified',
        body: 'Kwame posted a new update on the campaign you support.',
        campaignId: kwameId,
      },
      {
        userId: donor.id,
        type: 'MILESTONE',
        channel: 'IN_APP',
        title: '80% funded',
        body: "Amara Okonkwo's campaign just passed 80% of its tuition goal.",
        campaignId: amaraId,
        readAt: new Date(),
      },
      {
        userId: donor.id,
        type: 'THANK_YOU',
        channel: 'EMAIL',
        title: 'Thank you for your gift',
        body: 'Email copy (logged, not sent) of the donor thank-you.',
        campaignId: amaraId,
        emailLogged: true,
      },
    ],
  });
  console.log('Created donor-retention demo data (history, recurring, feed).');

  // --------------------------------------------------------------------------
  // E13 — Employer Matching: seed the ~30 known employer programs, set the demo
  // donor's detected employer (SAP), and a demo claim with a committed match
  // donation so the balance + claim-history are visible in the account.
  // --------------------------------------------------------------------------
  for (const p of EMPLOYER_PROGRAMS) {
    await prisma.employerMatchProgram.create({
      data: {
        domain: p.domain,
        employerName: p.employerName,
        matchRatio: p.matchRatio,
        annualCapCents: p.annualCapCents,
        minDonationCents: p.minDonationCents,
        integrationLevel: p.integrationLevel,
        applyUrlTemplate: p.applyUrlTemplate ?? null,
        active: p.active,
      },
    });
  }

  const sapProgram = await prisma.employerMatchProgram.findUnique({
    where: { domain: 'sap.com' },
  });
  const matchYear = new Date().getFullYear();
  const demoMatchCents = eur(150); // 1:1 match of the donor's €150 gift to Amara

  if (sapProgram) {
    // The donor's own €150 gift to Amara (seeded above) is the triggering donation.
    const triggerDonation = await prisma.donation.findFirst({
      where: { donorUserId: donor.id, providerRef: 'mock_seed_donor_amara' },
    });

    await prisma.user.update({
      where: { id: donor.id },
      data: {
        employerName: 'SAP',
        employerDomain: 'sap.com',
        matchYear,
        matchUsedCents: demoMatchCents,
      },
    });

    if (triggerDonation) {
      const matchDonation = await prisma.donation.create({
        data: {
          campaignId: amaraId,
          amountCents: demoMatchCents,
          method: 'SEPA',
          type: 'CORPORATE',
          status: 'SUCCEEDED',
          providerRef: `mock_match_${triggerDonation.id}`,
          donorName: 'SAP',
        },
      });
      await prisma.campaign.update({
        where: { id: amaraId },
        data: { raisedCents: { increment: demoMatchCents } },
      });
      await prisma.matchClaim.create({
        data: {
          donationId: triggerDonation.id,
          matchDonationId: matchDonation.id,
          programId: sapProgram.id,
          donorUserId: donor.id,
          campaignId: amaraId,
          employerName: 'SAP',
          matchCents: demoMatchCents,
          status: 'CLAIMED',
          applyUrl: `https://match.sap.example/apply?amount=150&employer=SAP`,
          year: matchYear,
        },
      });
    }
  }
  console.log(
    `Created E13 employer-matching demo data (${EMPLOYER_PROGRAMS.length} programs, SAP claim).`,
  );

  // --------------------------------------------------------------------------
  // E5 — Corporate channel demo: a named, logo-recognised SEPA sponsorship
  // (named scholarship on the campaign + a SPONSORING invoice with VAT).
  // --------------------------------------------------------------------------
  const liveCampaign = await prisma.campaign.findFirst({
    where: { status: 'LIVE', verification: { status: 'VERIFIED' } },
    orderBy: { raisedCents: 'asc' },
  });
  if (liveCampaign) {
    const gap = Math.max(0, liveCampaign.goalCents - liveCampaign.raisedCents);
    const net = Math.min(eur(8000), gap);
    if (net > 0) {
      const corpDonation = await prisma.donation.create({
        data: {
          campaignId: liveCampaign.id,
          corporateProfileId: sponsorProfile.id,
          amountCents: net,
          method: 'SEPA',
          type: 'CORPORATE',
          status: 'SUCCEEDED',
          providerRef: 'mock_seed_corp_sepa',
          donorName: 'Acme Capital',
          message: 'Proud to back the next generation of leaders.',
        },
      });
      const sponsorship = await prisma.corporateSponsorship.create({
        data: {
          donationId: corpDonation.id,
          corporateProfileId: sponsorProfile.id,
          campaignId: liveCampaign.id,
          tier: 'CUSTOM',
          fullTuition: false,
          scholarshipName: 'The Acme Capital Scholarship',
          logoRecognition: true,
          recognitionKind: 'NAMED',
          impactReportOptIn: true,
          poNumber: 'PO-2026-0042',
          vatId: 'DE811234567',
        },
      });
      const vat = Math.round(net * 0.19);
      await prisma.invoice.create({
        data: {
          sponsorshipId: sponsorship.id,
          invoiceNo: `BURSA-INV-${new Date().getFullYear()}-${sponsorship.id
            .slice(-8)
            .toUpperCase()}`,
          documentType: 'SPONSORING',
          netCents: net,
          vatCents: vat,
          grossCents: net + vat,
          vatId: 'DE811234567',
          poNumber: 'PO-2026-0042',
          status: 'PAID',
          settledAt: new Date(),
        },
      });
      await prisma.campaign.update({
        where: { id: liveCampaign.id },
        data: { raisedCents: { increment: net } },
      });
      console.log(
        'Created corporate-channel demo data (named scholarship + invoice).',
      );
    }
  }

  // Security audit trail demo data (E6): a small, PII-arm access log.
  await prisma.auditLog.createMany({
    data: [
      { action: 'auth.login', actorUserId: admin.id, ip: '203.0.113.10' },
      { action: 'auth.login', actorUserId: donor.id, ip: '198.51.100.7' },
      {
        action: 'auth.login_failed',
        ip: '203.0.113.66',
        metadata: { email: '[redacted]' },
      },
      {
        action: 'admin.verify',
        actorUserId: admin.id,
        targetType: 'Campaign',
        ip: '203.0.113.10',
      },
    ],
  });
  console.log('Created security audit-log demo data.');

  // Observability/funnel demo data (E7): a privacy-arm funnel so the operator
  // dashboard renders. visitorId is anonymous (never IP); no PII is stored.
  const obsCampaignId = liveCampaign?.id ?? null;
  const funnelEvents: {
    type: string;
    step?: string;
    campaignId?: string | null;
    visitorId: string;
  }[] = [];
  const funnelCounts: Record<string, number> = {
    gallery_view: 120,
    campaign_view: 48,
    donate_start: 14,
    donate_success: 6,
  };
  for (const [type, n] of Object.entries(funnelCounts)) {
    for (let i = 0; i < n; i++) {
      funnelEvents.push({
        type,
        campaignId: obsCampaignId,
        visitorId: `v_${type}_${i}`,
      });
    }
  }
  const onboardingCounts: Record<string, number> = {
    basics: 30,
    story: 22,
    video: 16,
    review: 13,
    submitted: 11,
  };
  for (const [step, n] of Object.entries(onboardingCounts)) {
    for (let i = 0; i < n; i++) {
      funnelEvents.push({
        type: 'onboarding_step',
        step,
        visitorId: `v_onb_${step}_${i}`,
      });
    }
  }
  await prisma.analyticsEvent.createMany({ data: funnelEvents });
  console.log(
    `Created observability funnel demo data (${funnelEvents.length} events).`,
  );

  // --------------------------------------------------------------------------
  // E8 — School portal demo data for schooladmin@bursa.test (ESMT Berlin):
  // imported admission list (verified + pending), a webhook event log, and a
  // hosted onboarding link for the not-yet-onboarded school (RSM).
  // --------------------------------------------------------------------------
  const esmtId = schoolByKey['esmt'];
  await prisma.admissionRecord.createMany({
    data: [
      {
        schoolId: esmtId,
        studentEmail: 'amara@bursa.test',
        studentName: 'Amara Okonkwo',
        programName: 'Full-Time MBA 2026',
        admissionRef: 'ADM-AMARA-OKONKWO',
        status: 'VERIFIED',
        reviewedById: schoolAdminUser.id,
        reviewedAt: new Date(),
      },
      {
        schoolId: esmtId,
        studentEmail: 'aisha@bursa.test',
        studentName: 'Aisha Bello',
        programName: 'Full-Time MBA 2026',
        admissionRef: 'ADM-AISHA-BELLO',
        status: 'VERIFIED',
        reviewedById: schoolAdminUser.id,
        reviewedAt: new Date(),
      },
      {
        schoolId: esmtId,
        studentEmail: 'grace@students.bursa.test',
        studentName: 'Grace Achieng',
        programName: 'Full-Time MBA 2026',
        admissionRef: 'ADM-GRACE-ACHIENG',
        status: 'VERIFIED',
        reviewedById: schoolAdminUser.id,
        reviewedAt: new Date(),
      },
      {
        schoolId: esmtId,
        studentEmail: 'noor@students.bursa.test',
        studentName: 'Noor Hassan',
        programName: 'Full-Time MBA 2026',
        admissionRef: 'ADM-NOOR-HASSAN',
        status: 'PENDING',
      },
      {
        schoolId: esmtId,
        studentEmail: 'david@students.bursa.test',
        studentName: 'David Kone',
        programName: 'Full-Time MBA 2026',
        admissionRef: 'ADM-DAVID-KONE',
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  });

  const nowIso = new Date().toISOString();
  await prisma.schoolWebhookEvent.createMany({
    data: [
      {
        schoolId: esmtId,
        type: 'student.reported',
        status: 'LOGGED',
        payload: {
          type: 'student.reported',
          schoolId: esmtId,
          occurredAt: nowIso,
          data: {
            studentName: 'Aisha Bello',
            admissionRef: 'ADM-AISHA-BELLO',
            status: 'VERIFIED',
          },
        },
      },
      {
        schoolId: esmtId,
        type: 'campaign.approved',
        status: 'LOGGED',
        payload: {
          type: 'campaign.approved',
          schoolId: esmtId,
          occurredAt: nowIso,
          data: { title: 'Closing the SME credit gap', goalCents: eur(40000) },
        },
      },
    ],
  });

  const rsmToken = createOnboardingToken();
  await prisma.schoolOnboardingToken.create({
    data: {
      schoolId: schoolByKey['rsm'],
      tokenHash: rsmToken.tokenHash,
      expiresAt: rsmToken.expiresAt,
    },
  });
  console.log(
    'Created E8 school-portal demo data (admissions, webhooks, onboarding link).',
  );
  console.log(
    `  Hosted onboarding demo (RSM): /school/onboarding/${rsmToken.token}`,
  );

  // --------------------------------------------------------------------------
  // E9 — Trust-and-Safety demo data so /admin/trust-safety renders: an
  // auto-flagged moderation case, community flags, demo chargebacks (one
  // campaign auto-frozen at 3+), fraud signals across days, a donor risk score,
  // and two moderation audit entries (reused E6 AuditLog) for the CSV export.
  // --------------------------------------------------------------------------
  const e9CampaignIds = Object.values(campaignBySlug);
  const flaggedCampaignId =
    campaignBySlug['kwame-mensah'] ?? e9CampaignIds[0] ?? null;
  const frozenCampaignId =
    campaignBySlug['amara-okonkwo'] ??
    e9CampaignIds[1] ??
    e9CampaignIds[0] ??
    null;
  const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);

  if (flaggedCampaignId) {
    await prisma.moderationCase.create({
      data: {
        campaignId: flaggedCampaignId,
        status: 'OPEN',
        riskScore: 65,
        riskLevel: 'HIGH',
        reasons: ['suspicious_keyword:guaranteed return', 'community_flags:2'],
        autoFlagged: true,
      },
    });
    await prisma.campaignFlag.createMany({
      data: [
        {
          campaignId: flaggedCampaignId,
          reporterUserId: donor.id,
          reason: 'SCAM',
          note: 'Story looks copied from another campaign.',
        },
        {
          campaignId: flaggedCampaignId,
          visitorId: 'anon-seed-1',
          reason: 'DUPLICATE',
          note: 'Saw an identical campaign elsewhere.',
        },
      ],
    });
    await prisma.chargeback.create({
      data: {
        providerEventId: 'dp_seed_4',
        campaignId: flaggedCampaignId,
        amountCents: 1500,
        currency: 'EUR',
        reason: 'duplicate',
        status: 'OPEN',
      },
    });
  }

  if (frozenCampaignId && frozenCampaignId !== flaggedCampaignId) {
    // Three chargebacks → campaign auto-frozen (mirrors the auto-freeze rule).
    await prisma.chargeback.createMany({
      data: [
        {
          providerEventId: 'dp_seed_1',
          campaignId: frozenCampaignId,
          amountCents: 45000,
          currency: 'EUR',
          reason: 'fraudulent',
          status: 'OPEN',
        },
        {
          providerEventId: 'dp_seed_2',
          campaignId: frozenCampaignId,
          amountCents: 38000,
          currency: 'EUR',
          reason: 'fraudulent',
          status: 'EVIDENCE_SUBMITTED',
          evidenceNote: 'Disbursement proof + receipt attached.',
        },
        {
          providerEventId: 'dp_seed_3',
          campaignId: frozenCampaignId,
          amountCents: 2000,
          currency: 'EUR',
          reason: 'product_not_received',
          status: 'REFUND_OFFERED',
          refundOffered: true,
        },
      ],
    });
    await prisma.campaign.update({
      where: { id: frozenCampaignId },
      data: {
        frozen: true,
        frozenAt: new Date(),
        freezeReason: 'chargeback_threshold:3',
      },
    });
    await prisma.moderationCase.create({
      data: {
        campaignId: frozenCampaignId,
        status: 'ESCALATED',
        riskScore: 80,
        riskLevel: 'CRITICAL',
        reasons: ['chargeback_pattern', 'community_flags:1'],
        autoFlagged: true,
        decisionNote: 'Escalated after 3 chargebacks.',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
  }

  await prisma.fraudSignal.createMany({
    data: [
      {
        kind: 'CARD_TESTING',
        score: 55,
        riskLevel: 'HIGH',
        reasons: ['failed_attempts:4', 'rapid_attempts:6'],
        donorUserId: donor.id,
        campaignId: flaggedCampaignId,
        createdAt: daysAgo(0),
      },
      {
        kind: 'HIGH_VALUE',
        score: 60,
        riskLevel: 'HIGH',
        reasons: ['high_value'],
        donorUserId: donor.id,
        campaignId: frozenCampaignId,
        createdAt: daysAgo(1),
      },
      {
        kind: 'VELOCITY',
        score: 35,
        riskLevel: 'MEDIUM',
        reasons: ['transaction_velocity:8'],
        donorUserId: donor.id,
        campaignId: flaggedCampaignId,
        createdAt: daysAgo(2),
      },
      {
        kind: 'DONOR_RISK',
        score: 20,
        riskLevel: 'LOW',
        reasons: ['prepaid_card'],
        donorUserId: donor.id,
        campaignId: frozenCampaignId,
        createdAt: daysAgo(3),
      },
    ],
  });

  await prisma.user.update({
    where: { id: donor.id },
    data: { riskScore: 55, riskLevel: 'HIGH' },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: 'moderation.escalate',
        actorUserId: admin.id,
        targetType: 'Campaign',
        targetId: frozenCampaignId,
        metadata: {
          result: 'ESCALATED',
          note: 'Escalated after 3 chargebacks.',
        },
      },
      {
        action: 'moderation.approve',
        actorUserId: admin.id,
        targetType: 'Campaign',
        targetId: flaggedCampaignId,
        metadata: { result: 'APPROVED', note: 'Reviewed earlier, legitimate.' },
      },
    ],
  });
  console.log(
    'Created E9 trust-safety demo data (moderation, flags, chargebacks, fraud signals).',
  );

  // --------------------------------------------------------------------------
  // E11 — KYC & Verification Pipeline demo data:
  //  - a VERIFIED student case (liveness passed + document matched), anchored to
  //    Amara's E8 admission record;
  //  - a MANUAL_REVIEW student case from an OCR/name mismatch (pending in the
  //    operator queue);
  //  - a sponsor AML check that produced a HIT (manual review).
  // Two audit entries (reused E6 AuditLog) make the decisions traceable.
  // --------------------------------------------------------------------------
  const amaraAdmission = await prisma.admissionRecord.findUnique({
    where: {
      schoolId_admissionRef: {
        schoolId: esmtId,
        admissionRef: 'ADM-AMARA-OKONKWO',
      },
    },
  });

  const verifiedCase = await prisma.verificationCase.create({
    data: {
      subjectType: 'STUDENT',
      subjectUserId: amaraUserId,
      admissionRecordId: amaraAdmission?.id ?? null,
      status: 'VERIFIED',
      reviewQueueStatus: 'NOT_REQUIRED',
      riskScore: 0,
      riskLevel: 'LOW',
      liveness: {
        create: {
          provider: 'mock',
          confidence: 94,
          passed: true,
          reference: 'seed_liveness_amara',
        },
      },
      document: {
        create: {
          provider: 'mock',
          extractedName: 'Amara Okonkwo',
          extractedSchool: 'ESMT Berlin',
          extractedDegree: 'MBA',
          nameMatchScore: 100,
          matched: true,
          registrarConfirmed: true,
          reference: 'seed_document_amara',
        },
      },
    },
  });

  await prisma.verificationCase.create({
    data: {
      subjectType: 'STUDENT',
      subjectUserId: donor.id,
      status: 'MANUAL_REVIEW',
      reviewQueueStatus: 'PENDING',
      riskScore: 25,
      riskLevel: 'MEDIUM',
      liveness: {
        create: {
          provider: 'mock',
          confidence: 88,
          passed: true,
          reference: 'seed_liveness_review',
        },
      },
      document: {
        create: {
          provider: 'mock',
          extractedName: 'Someone Else Entirely',
          extractedSchool: 'ESMT Berlin',
          extractedDegree: 'MBA',
          nameMatchScore: 20,
          matched: false,
          registrarConfirmed: false,
          reference: 'seed_document_review',
        },
      },
    },
  });

  const amlCase = await prisma.verificationCase.create({
    data: {
      subjectType: 'SPONSOR',
      subjectUserId: sponsorUser.id,
      status: 'MANUAL_REVIEW',
      reviewQueueStatus: 'PENDING',
      riskScore: 30,
      riskLevel: 'MEDIUM',
      aml: {
        create: {
          provider: 'mock',
          amountCents: 600000,
          country: 'NG',
          decision: 'HIT',
          reasons: ['Contribution from an elevated-risk country'],
          reference: 'seed_aml_acme',
        },
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: 'kyc.case.verified',
        actorUserId: admin.id,
        targetType: 'VerificationCase',
        targetId: verifiedCase.id,
        metadata: { result: 'VERIFIED', nameMatchScore: 100 },
      },
      {
        action: 'kyc.aml.hit',
        actorUserId: sponsorUser.id,
        targetType: 'VerificationCase',
        targetId: amlCase.id,
        metadata: { decision: 'HIT', country: 'NG' },
      },
    ],
  });
  console.log(
    'Created E11 KYC demo data (verified case, manual-review queue, AML hit).',
  );

  // --------------------------------------------------------------------------
  // E12 — Payout-Reconciliation & Transparenz-Layer demo data:
  //  - append-only LEDGER entries (with hash chain) for every captured/succeeded
  //    donation, every payout and every disbursement, per school;
  //  - a STALE payout (sent > 48h ago, reference ends "-STALE") with NO matching
  //    bank transaction → 48h reconciliation alert;
  //  - a MATCHED bank transaction for one real disbursed payout;
  //  - an ORPHAN bank transaction with no system payout.
  // The mock bank-feed derives matches at request time; here we persist enough so
  // the school dashboard shows a non-empty reconciliation out of the box.
  // --------------------------------------------------------------------------

  // Append ledger entries in deterministic order per school (donations, then
  // payouts/disbursements), keeping the hash chain valid.
  const lastPositionBySchool = new Map<
    string,
    { sequence: number; entryHash: string }
  >();
  async function appendLedger(
    movement: MovementInput,
    at: Date,
  ): Promise<void> {
    const previous = lastPositionBySchool.get(movement.schoolId) ?? null;
    const position = previous
      ? nextPosition(previous, at)
      : genesisPosition(at);
    const built = buildLedgerEntry(movement, position);
    await prisma.ledgerEntry.create({
      data: {
        sequence: built.sequence,
        entryType: built.entryType,
        amountCents: built.amountCents,
        currency: built.currency,
        schoolId: built.schoolId,
        actorUserId: built.actorUserId,
        reason: built.reason,
        refType: built.refType,
        refId: built.refId,
        prevHash: built.prevHash,
        entryHash: built.entryHash,
        createdAt: built.createdAt,
      },
    });
    lastPositionBySchool.set(movement.schoolId, {
      sequence: built.sequence,
      entryHash: built.entryHash,
    });
  }

  // Ledger DONATION entries for counted donations (oldest first for a stable chain).
  const ledgerDonations = await prisma.donation.findMany({
    where: { status: { in: ['SUCCEEDED', 'CAPTURED', 'PLEDGED'] } },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      createdAt: true,
      campaign: { select: { schoolId: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  for (const d of ledgerDonations) {
    await appendLedger(
      {
        entryType: LedgerEntryType.DONATION,
        amountCents: d.amountCents,
        currency: d.currency,
        schoolId: d.campaign.schoolId,
        reason: `Donation captured for ${d.campaign.title}`,
        refType: 'Donation',
        refId: d.id,
      },
      d.createdAt,
    );
  }

  // Ledger PAYOUT + DISBURSEMENT entries for existing payouts, and a matched bank
  // transaction for the first (CONFIRMED, disbursed) payout.
  const ledgerPayouts = await prisma.payout.findMany({
    select: {
      id: true,
      schoolId: true,
      amountCents: true,
      reference: true,
      status: true,
      sentAt: true,
      createdAt: true,
      campaign: { select: { title: true, currency: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  let matchedBankTxCreated = false;
  for (const p of ledgerPayouts) {
    const at = p.sentAt ?? p.createdAt;
    await appendLedger(
      {
        entryType: LedgerEntryType.PAYOUT,
        amountCents: p.amountCents,
        currency: p.campaign.currency,
        schoolId: p.schoolId,
        actorUserId: admin.id,
        reason: `Payout initiated for ${p.campaign.title}`,
        refType: 'Payout',
        refId: p.id,
      },
      at,
    );
    if (p.status === 'CONFIRMED') {
      await appendLedger(
        {
          entryType: LedgerEntryType.DISBURSEMENT,
          amountCents: p.amountCents,
          currency: p.campaign.currency,
          schoolId: p.schoolId,
          actorUserId: admin.id,
          reason: `Disbursement confirmed by ${p.campaign.title}'s school`,
          refType: 'Payout',
          refId: p.id,
        },
        at,
      );
      if (!matchedBankTxCreated) {
        await prisma.bankTransaction.create({
          data: {
            provider: 'mock',
            externalId: `mock_btx_${p.id}`,
            schoolId: p.schoolId,
            amountCents: p.amountCents,
            currency: p.campaign.currency,
            reference: p.reference,
            postedAt: new Date((p.sentAt ?? p.createdAt).getTime() + 3_600_000),
            matchedPayoutId: p.id,
            raw: { source: 'mock', payoutId: p.id },
          },
        });
        matchedBankTxCreated = true;
      }
    }
  }

  // A stale payout: SENT > 48h ago with a "-STALE" reference and NO bank tx →
  // the reconciliation flags it as a 48h alert. Attach it to a FUNDED campaign
  // that has not yet been disbursed (or fall back to any live campaign's school).
  const fundedNoPayout = await prisma.campaign.findFirst({
    where: { payout: null },
    select: {
      id: true,
      schoolId: true,
      raisedCents: true,
      currency: true,
      title: true,
    },
    orderBy: { raisedCents: 'desc' },
  });
  if (fundedNoPayout && fundedNoPayout.raisedCents > 0) {
    const staleSentAt = new Date(Date.now() - 72 * 3_600_000);
    const stalePayout = await prisma.payout.create({
      data: {
        campaignId: fundedNoPayout.id,
        schoolId: fundedNoPayout.schoolId,
        amountCents: fundedNoPayout.raisedCents,
        method: 'SEPA',
        reference: `mock_payout_seed_${fundedNoPayout.id.slice(-6)}-STALE`,
        status: 'SENT',
        proofNote: 'Awaiting bank confirmation (demo: stale > 48h).',
        sentAt: staleSentAt,
      },
    });
    await appendLedger(
      {
        entryType: LedgerEntryType.PAYOUT,
        amountCents: stalePayout.amountCents,
        currency: fundedNoPayout.currency,
        schoolId: fundedNoPayout.schoolId,
        actorUserId: admin.id,
        reason: `Payout initiated for ${fundedNoPayout.title} (awaiting bank)`,
        refType: 'Payout',
        refId: stalePayout.id,
      },
      staleSentAt,
    );
  }

  // An orphan bank transaction: money arrived with no matching system payout.
  const orphanSchoolId = ledgerPayouts[0]?.schoolId ?? esmtId;
  await prisma.bankTransaction.create({
    data: {
      provider: 'mock',
      externalId: `mock_orphan_seed_${orphanSchoolId}`,
      schoolId: orphanSchoolId,
      amountCents: 4200,
      currency: 'EUR',
      reference: 'UNKNOWN-INBOUND',
      postedAt: new Date(Date.now() - 6 * 3_600_000),
      raw: { source: 'mock', kind: 'orphan' },
    },
  });

  console.log(
    `Created E12 reconciliation demo data (ledger entries, matched + orphan + stale).`,
  );

  // --------------------------------------------------------------------------
  // E14 — ESG/CSRD reporting demo: tag a few ledger entries, fill optional
  // scholar diversity, generate one persisted report, and issue one auditor grant.
  // Read-only over the E12 ledger — the entries themselves are never mutated.
  // --------------------------------------------------------------------------

  // (a) Diversity data on the existing scholar profiles (synthetic, optional).
  const scholarProfiles = await prisma.studentProfile.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  const GENDERS: Gender[] = ['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED'];
  for (let i = 0; i < scholarProfiles.length; i++) {
    // Skip ~1 in 5 fields so the data-quality score is realistically incomplete.
    await prisma.studentProfile.update({
      where: { id: scholarProfiles[i].id },
      data: {
        gender:
          i % 5 === 4
            ? undefined
            : GENDERS[i % 3 === 0 ? 0 : i % GENDERS.length],
        birthYear: i % 4 === 3 ? undefined : 1990 + (i % 12),
        firstGen: i % 3 === 2 ? undefined : i % 2 === 0,
      },
    });
  }

  // (b) ESG-tag a handful of ledger entries (additive; entries stay immutable).
  const taggableEntries = await prisma.ledgerEntry.findMany({
    where: { entryType: { in: ['PAYOUT', 'DISBURSEMENT'] } },
    select: { id: true, entryType: true },
    orderBy: { createdAt: 'asc' },
    take: 6,
  });
  const TAG_CATEGORIES: EsgCategory[] = [
    'QUALITY_EDUCATION',
    'GENDER_EQUALITY',
    'GEOGRAPHIC_REACH',
    'POVERTY_REDUCTION',
    'ECONOMIC_GROWTH',
  ];
  for (let i = 0; i < taggableEntries.length; i++) {
    await prisma.esgTag.create({
      data: {
        ledgerEntryId: taggableEntries[i].id,
        category: TAG_CATEGORIES[i % TAG_CATEGORIES.length],
        note: 'Seed demo tag',
        taggedByUserId: admin.id,
      },
    });
  }

  // (c) Generate + persist one report snapshot (GRI 2024, current year) using the
  // same pure cores the service uses — read-only over the ledger.
  const reportYear = new Date().getUTCFullYear();
  const periodStart = new Date(Date.UTC(reportYear, 0, 1, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(reportYear, 11, 31, 23, 59, 59));
  const allLedgerForReport = await prisma.ledgerEntry.findMany({
    where: { createdAt: { gte: periodStart, lte: periodEnd } },
    orderBy: [{ schoolId: 'asc' }, { sequence: 'asc' }],
  });
  const reportProfiles = await prisma.studentProfile.findMany({
    select: { gender: true, birthYear: true, country: true, firstGen: true },
  });
  const reportTags = await prisma.esgTag.findMany({
    select: { category: true },
  });
  const aggregate = buildEsgAggregate({
    entries: allLedgerForReport.map((e) => ({
      entryType: e.entryType,
      amountCents: e.amountCents,
      createdAt: e.createdAt,
    })),
    profiles: reportProfiles,
    tags: reportTags,
    refYear: reportYear,
  });
  const reportView = {
    standard: 'GRI_2024' as ReportStandard,
    period: { start: periodStart, end: periodEnd },
    metrics: mapToStandard('GRI_2024', aggregate),
    annotations: buildAnnotations(
      allLedgerForReport
        .filter(
          (e) => e.entryType === 'PAYOUT' || e.entryType === 'DISBURSEMENT',
        )
        .map((e) => ({
          sequence: e.sequence,
          entryType: e.entryType,
          amountCents: e.amountCents,
          reason: e.reason,
          entryHash: e.entryHash,
        })),
    ),
  };
  await prisma.esgReport.create({
    data: {
      standard: 'GRI_2024',
      periodStart,
      periodEnd,
      metricsJson: reportView as unknown as Prisma.InputJsonValue,
      createdByUserId: admin.id,
    },
  });

  // (d) One demo auditor access grant (48h, read-only). Raw token logged once.
  const auditorToken = createAuditorToken();
  await prisma.auditorAccessGrant.create({
    data: {
      label: 'Demo external auditor (seed)',
      tokenHash: auditorToken.tokenHash,
      scope: null,
      expiresAt: auditorToken.expiresAt,
      createdByUserId: admin.id,
    },
  });

  console.log(
    `Created E14 CSRD demo data (diversity on ${scholarProfiles.length} scholars, ` +
      `${taggableEntries.length} ESG tags, 1 GRI report, 1 auditor grant).`,
  );
  console.log(`  Demo auditor portal: /audit-portal/${auditorToken.token}`);

  // --------------------------------------------------------------------------
  // E15 — Referral & Advocate engine demo data.
  //  - donor@bursa.test gets a referral link plus referred friends (so the
  //    tracking dashboard and the both-win badge are non-empty), opted into the
  //    anonymous leaderboard.
  //  - Amara's campaign gets a small advocate team with referred donations, so
  //    the advocate leaderboard + reward tiers render out of the box.
  // Attribution is money-free: every referred donation still credits its
  // campaign, whose funds flow to the school.
  // --------------------------------------------------------------------------
  const referralAmaraId = campaignBySlug['amara-okonkwo'];
  if (referralAmaraId) {
    // Donor's own referral link (opted into the anonymous leaderboard).
    const donorCode = createReferralCode();
    const donorLink = await prisma.referralLink.create({
      data: {
        donorUserId: donor.id,
        code: donorCode.code,
        codeHash: donorCode.codeHash,
        optInLeaderboard: true,
      },
    });

    // Three referred friends; two donate (one of them recurring → "active").
    const referredFriends = [
      { email: 'friend.ada@bursa.test', name: 'Ada Referred', donates: true },
      { email: 'friend.ben@bursa.test', name: 'Ben Referred', donates: true },
      { email: 'friend.cy@bursa.test', name: 'Cy Invited', donates: false },
    ];
    let referredActiveCount = 0;
    for (const [i, friend] of referredFriends.entries()) {
      const friendUser = await prisma.user.create({
        data: {
          email: friend.email,
          passwordHash,
          displayName: friend.name,
          role: 'DONOR',
        },
      });
      if (!friend.donates) continue;

      const recurring = i === 0; // the first donor keeps giving → counts as active
      let recurringPledgeId: string | null = null;
      if (recurring) {
        const pledge = await prisma.recurringPledge.create({
          data: {
            donorUserId: friendUser.id,
            campaignId: referralAmaraId,
            amountCents: eur(25),
            status: 'ACTIVE',
            nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        recurringPledgeId = pledge.id;
        referredActiveCount += 1;
      }

      const referredDonation = await prisma.donation.create({
        data: {
          campaignId: referralAmaraId,
          donorUserId: friendUser.id,
          amountCents: eur(recurring ? 25 : 60),
          method: 'CARD',
          type: 'PRIVATE',
          status: 'CAPTURED',
          providerRef: `mock_seed_referral_${i}`,
          donorName: friend.name,
          donorCountry: donorCountryFor(friend.name),
          recurringPledgeId,
          capturedAt: new Date(),
        },
      });
      await prisma.referralAttribution.create({
        data: {
          kind: 'REFERRAL',
          referralLinkId: donorLink.id,
          donationId: referredDonation.id,
        },
      });
    }

    // Advocate team on Amara's campaign with referred conversions.
    const advocateSeeds = [
      { name: 'Chidi Alumni', email: 'chidi.alumni@bursa.test', referrals: 6 },
      { name: 'Ngozi Mentor', email: 'ngozi.mentor@bursa.test', referrals: 3 },
      { name: 'Tunde Friend', email: null, referrals: 1 },
    ];
    let advocateDonationSeq = 0;
    for (const adv of advocateSeeds) {
      const advCode = createReferralCode();
      const invite = await prisma.advocateInvite.create({
        data: {
          campaignId: referralAmaraId,
          name: adv.name,
          email: adv.email,
          codeHash: advCode.codeHash,
        },
      });
      for (let r = 0; r < adv.referrals; r += 1) {
        const advDonation = await prisma.donation.create({
          data: {
            campaignId: referralAmaraId,
            amountCents: eur(40),
            method: 'CARD',
            type: 'PRIVATE',
            status: 'CAPTURED',
            providerRef: `mock_seed_advocate_${advocateDonationSeq}`,
            donorName: `Backer ${advocateDonationSeq}`,
            donorCountry: donorCountryFor(`Backer ${advocateDonationSeq}`),
            capturedAt: new Date(),
          },
        });
        advocateDonationSeq += 1;
        await prisma.referralAttribution.create({
          data: {
            kind: 'ADVOCATE',
            advocateInviteId: invite.id,
            donationId: advDonation.id,
          },
        });
      }
    }

    console.log(
      `Created E15 referral demo data (donor link + ${referredFriends.length} ` +
        `friends [${referredActiveCount} active], 3 advocates with ` +
        `${advocateDonationSeq} referred donations).`,
    );
  }

  // --------------------------------------------------------------------------
  // E17 — Multi-Channel Impact-Feed demo data for donor@bursa.test.
  //  - one moderated (APPROVED) student-voice message on Amara's campaign, so
  //    the feed shows a student thank-you card with a video URL out of the box;
  //  - donor channel preferences (WhatsApp + Telegram opted in, with handles),
  //    so the channel-prefs panel and the mocked fan-out have something to send;
  //  - feed-read rows across the current + previous two months, so the
  //    update-read streak (E16 streak primitive) renders a non-zero streak.
  // E17 layers on top of E4: the E4 email thank-you path is untouched. Nothing
  // here writes to a donation/payout — money still goes to the school.
  // Idempotent via the full clearDatabase() reset at the top of main().
  // --------------------------------------------------------------------------
  const feedAmaraId = campaignBySlug['amara-okonkwo'];
  if (feedAmaraId) {
    await prisma.studentMessage.create({
      data: {
        campaignId: feedAmaraId,
        text: 'Thank you for believing in me — I just started my second semester and could not have done it without your support.',
        videoUrl: 'https://example.com/amara-thank-you.mp4',
        voiceUrl: null,
        status: 'APPROVED',
        moderationReason: null,
      },
    });

    await prisma.notificationChannelPref.createMany({
      data: [
        {
          userId: donor.id,
          channel: 'WHATSAPP',
          optIn: true,
          handle: '+4915112345678',
        },
        {
          userId: donor.id,
          channel: 'TELEGRAM',
          optIn: true,
          handle: '987654321',
        },
        { userId: donor.id, channel: 'EMAIL', optIn: true },
        { userId: donor.id, channel: 'PUSH', optIn: false },
      ],
    });

    // A 3-month update-read streak (current + two previous months).
    await prisma.feedRead.createMany({
      data: [
        {
          userId: donor.id,
          feedItemKey: `voice:seed-${feedAmaraId}`,
          readAt: monthsAgo(0),
        },
        {
          userId: donor.id,
          feedItemKey: `update:seed-${feedAmaraId}-prev`,
          readAt: monthsAgo(1),
        },
        {
          userId: donor.id,
          feedItemKey: `milestone:${feedAmaraId}:80`,
          readAt: monthsAgo(2),
        },
      ],
    });

    console.log(
      'Created E17 impact-feed demo data (1 approved student voice, ' +
        '4 channel prefs [WhatsApp + Telegram opt-in], 3-month read streak).',
    );
  }

  console.log('\nDemo accounts (password: ' + PASSWORD + ')');
  console.log(
    '  admin@bursa.test · schooladmin@bursa.test · sponsor@acme.test · donor@bursa.test · amara@bursa.test',
  );
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
