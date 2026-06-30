import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { LedgerView, ReconciliationView } from '../../core/models';
import { SchoolReconciliationComponent } from './reconciliation-panel.component';

const reconciliation: ReconciliationView = {
  schoolId: 'school-1',
  runAt: '2026-06-30T12:00:00.000Z',
  summary: {
    matchedCount: 1,
    pendingCount: 0,
    unmatchedCount: 1,
    discrepancyCount: 1,
    bankTxCount: 2,
  },
  rows: [
    {
      payoutId: 'p1',
      campaignTitle: 'Amara Okonkwo',
      amountCents: 40000,
      currency: 'EUR',
      payoutStatus: 'CONFIRMED',
      reconciliationStatus: 'MATCHED',
      bankTx: {
        externalId: 'btx-1',
        amountCents: 40000,
        currency: 'EUR',
        reference: 'REF-1',
        postedAt: '2026-06-30T11:00:00.000Z',
      },
      discrepancyCents: null,
      sentAt: '2026-06-30T10:00:00.000Z',
    },
    {
      payoutId: 'p2',
      campaignTitle: 'Kwame Mensah',
      amountCents: 25000,
      currency: 'EUR',
      payoutStatus: 'SENT',
      reconciliationStatus: 'DISCREPANCY',
      bankTx: null,
      discrepancyCents: -500,
      sentAt: '2026-06-27T10:00:00.000Z',
    },
  ],
  unmatchedBankTx: [],
  alerts: [
    {
      payoutId: 'p3',
      campaignTitle: 'Aisha Bello',
      amountCents: 30000,
      hoursStale: 72,
    },
  ],
};

const ledger: LedgerView = {
  schoolId: 'school-1',
  integrity: { valid: true, checkedCount: 3, brokenAtSequence: null },
  entries: [
    {
      sequence: 3,
      entryType: 'DISBURSEMENT',
      amountCents: 40000,
      currency: 'EUR',
      reason: 'Disbursement confirmed',
      refType: 'Payout',
      refId: 'p1',
      entryHash: 'abc',
      createdAt: '2026-06-30T10:00:00.000Z',
    },
  ],
};

function setup(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    providers: [{ provide: ApiService, useValue: api }],
  });
  return TestBed.runInInjectionContext(() => new SchoolReconciliationComponent());
}

describe('SchoolReconciliationComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads reconciliation + ledger and exposes derived views', () => {
    const c = setup({
      schoolReconciliation: () => of(reconciliation),
      schoolLedger: () => of(ledger),
      reconciliationExportUrl: (k) => `/api/x/${k}`,
    } as Partial<ApiService>);

    expect(c.data()).toEqual(reconciliation);
    expect(c.ledger()).toEqual(ledger);
    expect(c.tiles()).toHaveLength(4);
    expect(c.alerts()).toHaveLength(1);
    expect(c.rows()).toHaveLength(2);
    expect(c.attention()).toBe(true);
  });

  it('formats rows, alerts and ledger integrity', () => {
    const c = setup({
      schoolReconciliation: () => of(reconciliation),
      schoolLedger: () => of(ledger),
      reconciliationExportUrl: (k) => `/api/x/${k}`,
    } as Partial<ApiService>);

    expect(c.statusLabel('MATCHED')).toBe('Matched');
    expect(c.statusClass('DISCREPANCY')).toContain('brand-orange');
    expect(c.eur(40000)).toContain('400');
    expect(c.discrepancy(-500)).toContain('-');
    expect(c.alertLine(reconciliation.alerts[0])).toContain('Aisha Bello');
    expect(c.toneClass({ label: 'x', value: '1', tone: 'good' })).toContain('brand-green');
    expect(c.integrityLabel(ledger)).toContain('Verified');
    expect(c.exportUrl('pdf')).toBe('/api/x/pdf');
  });

  it('shows a broken-integrity label', () => {
    const broken: LedgerView = {
      ...ledger,
      integrity: { valid: false, checkedCount: 3, brokenAtSequence: 2 },
    };
    const c = setup({
      schoolReconciliation: () => of(reconciliation),
      schoolLedger: () => of(broken),
      reconciliationExportUrl: (k) => `/api/x/${k}`,
    } as Partial<ApiService>);
    expect(c.integrityLabel(broken)).toContain('#2');
  });

  it('sets an error message when the reconciliation load fails', () => {
    const c = setup({
      schoolReconciliation: () => throwError(() => new Error('boom')),
      schoolLedger: () => throwError(() => new Error('boom')),
      reconciliationExportUrl: (k) => `/api/x/${k}`,
    } as Partial<ApiService>);
    expect(c.error()).toBe('Could not load the reconciliation.');
    expect(c.data()).toBeNull();
    // Defaults when no data.
    expect(c.tiles()).toHaveLength(0);
    expect(c.alerts()).toHaveLength(0);
    expect(c.rows()).toHaveLength(0);
    expect(c.attention()).toBe(false);
  });
});
