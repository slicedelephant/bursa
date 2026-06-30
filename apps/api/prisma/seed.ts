import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { createOnboardingToken } from '../src/schools/onboarding-token';

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
  await prisma.invoice.deleteMany();
  await prisma.corporateSponsorship.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.updateSubscription.deleteMany();
  await prisma.campaignUpdate.deleteMany();
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
