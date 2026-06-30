import { PortfolioService } from './portfolio.service';

const donationRow = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  campaignId: 'c1',
  amountCents: 5000,
  status: 'CAPTURED',
  createdAt: new Date('2026-06-01'),
  campaign: {
    title: 'Help Amara',
    raisedCents: 1840000,
    goalCents: 4500000,
    status: 'LIVE',
    verification: { status: 'VERIFIED' },
    school: { name: 'ESMT Berlin' },
    studentProfile: {
      fullName: 'Amara Okonkwo',
      photoUrl: '/seed/amara.png',
      country: 'Nigeria',
    },
  },
  ...over,
});

function buildPrisma(rows: Array<Record<string, unknown>>) {
  return {
    donation: {
      // Honor the status filter the service passes, like Prisma would.
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          rows.filter((r) =>
            (where?.status?.in as string[] | undefined)?.includes(
              r.status as string,
            ),
          ),
        ),
      ),
      // Population aggregate for the peer comparison: distinct campaigns per donor.
      groupBy: jest.fn().mockResolvedValue([
        { donorUserId: 'u1', campaignId: 'c1' },
        { donorUserId: 'u1', campaignId: 'c2' },
        { donorUserId: 'u2', campaignId: 'c1' },
      ]),
    },
  };
}

describe('PortfolioService', () => {
  it('builds a portfolio from counted donations with streak, badge, stats and peer', async () => {
    const rows = [
      donationRow(),
      donationRow({
        id: 'd2',
        campaignId: 'c1',
        amountCents: 3000,
        createdAt: new Date('2026-05-02'),
      }),
      donationRow({
        id: 'd3',
        campaignId: 'c2',
        amountCents: 2000,
        createdAt: new Date('2026-04-02'),
        campaign: {
          title: 'Kwame to INSEAD',
          raisedCents: 500000,
          goalCents: 5000000,
          status: 'FUNDED',
          verification: { status: 'PENDING' },
          school: { name: 'INSEAD' },
          studentProfile: {
            fullName: 'Kwame Mensah',
            photoUrl: null,
            country: 'Ghana',
          },
        },
      }),
    ];
    const prisma = buildPrisma(rows);
    const svc = new PortfolioService(prisma as never);

    const view = await svc.portfolio('u1', new Date('2026-06-20'));

    expect(view.items).toHaveLength(2); // c1 aggregated, c2 separate
    const c1 = view.items.find((i) => i.campaignId === 'c1')!;
    expect(c1.yourContributionCents).toBe(8000); // 5000 + 3000
    expect(c1.verified).toBe(true);
    expect(c1.canDonateAgain).toBe(true);
    expect(c1.percent).toBe(41);

    const c2 = view.items.find((i) => i.campaignId === 'c2')!;
    expect(c2.verified).toBe(false);
    expect(c2.canDonateAgain).toBe(false); // not LIVE

    expect(view.stats.totalCents).toBe(10000);
    expect(view.stats.distinctTargets).toBe(2);
    expect(view.streak.currentMonths).toBe(3); // Apr, May, Jun
    expect(view.badge.tier).toBe('BRONZE');
    expect(view.peer.yourValue).toBe(2);
    // population: u1 supports 2, u2 supports 1 -> average 1.5
    expect(view.peer.peerAverage).toBe(1.5);
    expect(view.peer.ahead).toBe(true);
  });

  it('falls back gracefully when a campaign has no student profile', async () => {
    const rows = [
      donationRow({
        id: 'd9',
        campaignId: 'c9',
        amountCents: 1500,
        campaign: {
          title: 'Anonymous campaign',
          raisedCents: 100,
          goalCents: 1000,
          status: 'LIVE',
          verification: null,
          school: { name: 'Some School' },
          studentProfile: null,
        },
      }),
    ];
    const prisma = buildPrisma(rows);
    const svc = new PortfolioService(prisma as never);

    const view = await svc.portfolio('u1', new Date('2026-06-20'));
    expect(view.items[0].studentName).toBe('A student');
    expect(view.items[0].photoUrl).toBeNull();
    expect(view.items[0].country).toBe('');
    expect(view.items[0].verified).toBe(false);
  });

  it('ignores FAILED and PENDING donations', async () => {
    const rows = [
      donationRow({ id: 'd1', status: 'FAILED', amountCents: 9999 }),
      donationRow({ id: 'd2', status: 'PENDING', amountCents: 9999 }),
      donationRow({ id: 'd3', status: 'CAPTURED', amountCents: 4000 }),
    ];
    const prisma = buildPrisma(rows);
    const svc = new PortfolioService(prisma as never);

    const view = await svc.portfolio('u1', new Date('2026-06-20'));
    expect(view.items).toHaveLength(1);
    expect(view.items[0].yourContributionCents).toBe(4000);
    expect(view.stats.totalCents).toBe(4000);
  });

  it('returns an empty portfolio for a donor with no counted donations', async () => {
    const prisma = buildPrisma([]);
    prisma.donation.groupBy = jest.fn().mockResolvedValue([]);
    const svc = new PortfolioService(prisma as never);

    const view = await svc.portfolio('u1', new Date('2026-06-20'));
    expect(view.items).toEqual([]);
    expect(view.streak.currentMonths).toBe(0);
    expect(view.badge.tier).toBe('NONE');
    expect(view.stats.totalCents).toBe(0);
    expect(view.peer.yourValue).toBe(0);
  });

  it('produces a CSV export with a header and student rows', async () => {
    const prisma = buildPrisma([donationRow()]);
    const svc = new PortfolioService(prisma as never);
    const csv = await svc.portfolioCsv('u1');
    expect(csv.split('\n')[0]).toContain('Student,Country,School');
    expect(csv).toContain('Amara Okonkwo');
  });

  it('produces a valid PDF export', async () => {
    const prisma = buildPrisma([donationRow()]);
    const svc = new PortfolioService(prisma as never);
    const pdf = await svc.portfolioPdf('u1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});
