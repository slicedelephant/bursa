import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

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
  await prisma.campaignUpdate.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.admissionVerification.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.corporateProfile.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
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
        payoutVerified: s.verified,
        payoutAccountRef: s.verified
          ? `DE89 3704 ${Math.floor(1000 + Math.random() * 8999)} ${s.key.toUpperCase()}`
          : null,
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
  void donor;

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
        goalCents: eur(st.goal),
        raisedCents,
        status: campaignStatus,
      },
    });

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
  console.log('\nDemo accounts (password: ' + PASSWORD + ')');
  console.log(
    '  admin@bursa.test · sponsor@acme.test · donor@bursa.test · amara@bursa.test',
  );
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
