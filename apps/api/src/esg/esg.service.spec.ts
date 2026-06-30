import { EsgService } from './esg.service';
import { createAuditorToken } from './auditor-access-token';
import { buildLedgerEntry, genesisPosition } from '../ledger/ledger-entry';

/** A genuinely chain-valid genesis ledger row (real entryHash). */
function validLedgerRow() {
  const built = buildLedgerEntry(
    {
      entryType: 'PAYOUT',
      amountCents: 250_000,
      schoolId: 's1',
      reason: 'tuition disbursement',
    },
    genesisPosition(new Date('2026-03-01T00:00:00Z')),
  );
  return { id: 'le1', ...built };
}

function ledgerRow(over: Record<string, unknown> = {}) {
  return {
    id: 'le1',
    schoolId: 's1',
    sequence: 1,
    entryType: 'PAYOUT',
    amountCents: 250_000,
    currency: 'EUR',
    actorUserId: null,
    reason: 'tuition disbursement',
    refType: null,
    refId: null,
    prevHash: '',
    entryHash: 'hash1',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    ...over,
  };
}

function buildDeps() {
  const prisma = {
    ledgerEntry: {
      findUnique: jest.fn().mockResolvedValue({ id: 'le1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    esgTag: {
      upsert: jest.fn(({ create }) => ({
        id: 'tag1',
        ledgerEntryId: create?.ledgerEntryId ?? 'le1',
        category: 'QUALITY_EDUCATION',
        note: null,
        createdAt: new Date('2026-06-30T00:00:00Z'),
      })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    studentProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'sp1' }),
      update: jest.fn(({ data }) => ({
        id: 'sp1',
        gender: data.gender ?? null,
        birthYear: data.birthYear ?? null,
        firstGen: data.firstGen ?? null,
      })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    esgReport: {
      create: jest.fn(({ data }) => ({
        id: 'rep1',
        standard: data.standard,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        metricsJson: data.metricsJson,
        createdAt: new Date('2026-06-30T00:00:00Z'),
      })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    auditorAccessGrant: {
      create: jest.fn(({ data }) => ({
        id: 'g1',
        label: data.label,
        tokenHash: data.tokenHash,
        scope: data.scope ?? null,
        expiresAt: data.expiresAt,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date('2026-06-30T00:00:00Z'),
      })),
      findUnique: jest.fn(),
      update: jest.fn(({ data }) => ({
        id: 'g1',
        revokedAt: data.revokedAt ?? null,
      })),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const ledger = {
    listAllForReporting: jest.fn().mockResolvedValue([]),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const analytics = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new EsgService(
    prisma as never,
    ledger as never,
    audit as never,
    analytics as never,
  );
  return { service, prisma, ledger, audit, analytics };
}

describe('EsgService', () => {
  describe('tagEntry', () => {
    it('upserts a tag and logs audit + analytics', async () => {
      const { service, prisma, audit, analytics } = buildDeps();
      const out = await service.tagEntry('admin1', {
        ledgerEntryId: 'le1',
        category: 'QUALITY_EDUCATION',
      });
      expect(out.category).toBe('QUALITY_EDUCATION');
      expect(prisma.esgTag.upsert).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'esg.tag_set' }),
      );
      expect(analytics.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'esg.tagged' }),
      );
    });

    it('404s when the ledger entry is missing', async () => {
      const { service, prisma } = buildDeps();
      prisma.ledgerEntry.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.tagEntry('admin1', {
          ledgerEntryId: 'x',
          category: 'GENDER_EQUALITY',
        }),
      ).rejects.toThrow('Ledger entry not found');
    });
  });

  describe('setDiversity', () => {
    it('updates optional diversity fields', async () => {
      const { service } = buildDeps();
      const out = await service.setDiversity('sp1', {
        gender: 'FEMALE',
        birthYear: 1998,
        firstGen: true,
      });
      expect(out).toEqual({
        studentProfileId: 'sp1',
        gender: 'FEMALE',
        birthYear: 1998,
        firstGen: true,
      });
    });

    it('404s for an unknown profile', async () => {
      const { service, prisma } = buildDeps();
      prisma.studentProfile.findUnique.mockResolvedValueOnce(null);
      await expect(service.setDiversity('x', {})).rejects.toThrow(
        'Student profile not found',
      );
    });
  });

  describe('buildReport', () => {
    it('reads the ledger read-only and maps metrics + annotations', async () => {
      const { service, ledger } = buildDeps();
      ledger.listAllForReporting.mockResolvedValueOnce([
        ledgerRow(),
        ledgerRow({
          id: 'le2',
          entryType: 'DONATION',
          sequence: 2,
          amountCents: 10_000,
        }),
      ]);
      const view = await service.buildReport('GRI_2024', 2026);
      expect(view.standard).toBe('GRI_2024');
      expect(view.metrics.length).toBeGreaterThan(0);
      // only PAYOUT/DISBURSEMENT entries are annotated
      expect(view.annotations).toHaveLength(1);
      expect(view.annotations[0].entryHash).toBe('hash1');
      expect(ledger.listAllForReporting).toHaveBeenCalled();
    });
  });

  describe('createReport + exports', () => {
    it('persists a snapshot and logs it', async () => {
      const { service, prisma, audit } = buildDeps();
      const out = await service.createReport('admin1', 'CSRD_ESRS', 2026);
      expect(out.id).toBe('rep1');
      expect(prisma.esgReport.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'esg.report_generated' }),
      );
    });

    it('exports CSV and PDF from a persisted snapshot', async () => {
      const { service, prisma } = buildDeps();
      const view = {
        standard: 'GRI_2024',
        period: { start: '2026-01-01', end: '2026-12-31' },
        metrics: [
          { code: 'GRI 201-1', label: 'X', value: 1, unit: 'EUR', note: 'n' },
        ],
        annotations: [
          {
            ref: 1,
            sequence: 7,
            entryType: 'PAYOUT',
            amountCents: 250000,
            reason: 'r',
            entryHash: 'h',
          },
        ],
      };
      prisma.esgReport.findUnique.mockResolvedValue({
        id: 'rep1',
        metricsJson: view,
      });
      const csv = await service.reportCsv('admin1', 'rep1');
      expect(csv).toContain('GRI 201-1');
      const pdf = await service.reportPdf('admin1', 'rep1');
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    });

    it('404s exporting a missing report', async () => {
      const { service, prisma } = buildDeps();
      prisma.esgReport.findUnique.mockResolvedValue(null);
      await expect(service.reportCsv('a', 'nope')).rejects.toThrow(
        'Report not found',
      );
    });

    it('lists persisted reports newest-first', async () => {
      const { service, prisma } = buildDeps();
      prisma.esgReport.findMany.mockResolvedValueOnce([
        {
          id: 'rep1',
          standard: 'GRI_2024',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-12-31'),
          createdAt: new Date('2026-06-30'),
        },
      ]);
      const out = await service.listReports();
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('rep1');
    });
  });

  describe('dataQuality + trend', () => {
    it('computes data quality over profiles', async () => {
      const { service, prisma } = buildDeps();
      prisma.studentProfile.findMany.mockResolvedValueOnce([
        { gender: 'FEMALE', birthYear: 1998, country: 'Ghana', firstGen: true },
        { gender: null, birthYear: null, country: 'Kenya', firstGen: null },
      ]);
      const dq = await service.dataQuality();
      expect(dq.fields.find((f) => f.field === 'gender')!.pct).toBe(50);
    });

    it('builds a year-over-year trend', async () => {
      const { service, ledger, prisma } = buildDeps();
      ledger.listAllForReporting.mockResolvedValueOnce([
        ledgerRow({ amountCents: 100000, createdAt: new Date('2025-03-01') }),
        ledgerRow({ amountCents: 200000, createdAt: new Date('2026-03-01') }),
      ]);
      prisma.studentProfile.findMany.mockResolvedValueOnce([
        { gender: 'FEMALE', createdAt: new Date('2025-01-01') },
        { gender: 'FEMALE', createdAt: new Date('2026-01-01') },
      ]);
      const t = await service.trend();
      expect(t.years.map((y) => y.year)).toEqual([2025, 2026]);
      expect(t.deltas).toHaveLength(1);
    });
  });

  describe('auditor grants', () => {
    it('creates a grant and returns the raw token once', async () => {
      const { service, prisma, audit } = buildDeps();
      const out = await service.createGrant('admin1', {
        label: 'PwC',
        ttlHours: 48,
      });
      expect(out.token).toMatch(/^[0-9a-f]+$/);
      expect(out.portalUrl).toContain(out.token);
      expect(prisma.auditorAccessGrant.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'esg.auditor_grant_created' }),
      );
    });

    it('revokes a grant', async () => {
      const { service, prisma } = buildDeps();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce({ id: 'g1' });
      const out = await service.revokeGrant('admin1', 'g1');
      expect(out.id).toBe('g1');
      expect(prisma.auditorAccessGrant.update).toHaveBeenCalled();
    });

    it('404s revoking a missing grant', async () => {
      const { service, prisma } = buildDeps();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce(null);
      await expect(service.revokeGrant('a', 'x')).rejects.toThrow(
        'Grant not found',
      );
    });

    it('lists grants with derived status', async () => {
      const { service, prisma } = buildDeps();
      const future = new Date(Date.now() + 3600_000);
      const past = new Date(Date.now() - 3600_000);
      prisma.auditorAccessGrant.findMany.mockResolvedValueOnce([
        {
          id: 'a',
          label: 'active',
          expiresAt: future,
          revokedAt: null,
          lastUsedAt: null,
          createdAt: future,
        },
        {
          id: 'e',
          label: 'expired',
          expiresAt: past,
          revokedAt: null,
          lastUsedAt: null,
          createdAt: past,
        },
        {
          id: 'r',
          label: 'revoked',
          expiresAt: future,
          revokedAt: new Date(),
          lastUsedAt: null,
          createdAt: future,
        },
      ]);
      const grants = await service.listGrants();
      expect(grants.map((g) => g.status)).toEqual([
        'ACTIVE',
        'EXPIRED',
        'REVOKED',
      ]);
    });
  });

  describe('openAuditPortal', () => {
    it('returns the trail for a valid token and stamps lastUsedAt', async () => {
      const { service, prisma, analytics } = buildDeps();
      const created = createAuditorToken();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce({
        id: 'g1',
        label: 'PwC',
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        revokedAt: null,
      });
      prisma.ledgerEntry.findMany.mockResolvedValueOnce([
        { ...validLedgerRow(), esgTag: { category: 'QUALITY_EDUCATION' } },
      ]);
      const res = await service.openAuditPortal(created.token);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.entries[0].category).toBe('QUALITY_EDUCATION');
        expect(res.data.integrity.valid).toBe(true);
      }
      expect(prisma.auditorAccessGrant.update).toHaveBeenCalled();
      expect(analytics.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'auditor.portal_viewed' }),
      );
    });

    it('reports broken integrity when an entry is tampered', async () => {
      const { service, prisma } = buildDeps();
      const created = createAuditorToken();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce({
        id: 'g1',
        label: 'PwC',
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        revokedAt: null,
      });
      // A row whose entryHash does not match its canonical fields → chain broken.
      const tampered = {
        ...validLedgerRow(),
        entryHash: 'tampered',
        esgTag: null,
      };
      prisma.ledgerEntry.findMany.mockResolvedValueOnce([tampered]);
      const res = await service.openAuditPortal(created.token);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.integrity.valid).toBe(false);
        expect(res.data.entries[0].category).toBeNull();
      }
    });

    it('rejects a malformed/unknown token', async () => {
      const { service, prisma } = buildDeps();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce(null);
      const res = await service.openAuditPortal('deadbeef');
      expect(res.ok).toBe(false);
    });

    it('rejects a revoked grant', async () => {
      const { service, prisma } = buildDeps();
      const created = createAuditorToken();
      prisma.auditorAccessGrant.findUnique.mockResolvedValueOnce({
        id: 'g1',
        label: 'PwC',
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        revokedAt: new Date(),
      });
      const res = await service.openAuditPortal(created.token);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe('revoked');
    });
  });
});
