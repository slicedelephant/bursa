import {
  buildJournal,
  GL_BANK_CREDIT,
  GL_DISBURSEMENT_DEBIT,
  journalToCsv,
  JournalPayoutInput,
  payoutToJournalLines,
} from './double-entry';

const payout = (id: string, amount: number): JournalPayoutInput => ({
  payoutId: id,
  campaignTitle: `Campaign ${id}`,
  amountCents: amount,
  sentAt: new Date('2026-06-20T10:00:00.000Z'),
});

describe('double-entry', () => {
  describe('payoutToJournalLines', () => {
    it('produces a balanced debit/credit pair with GL codes', () => {
      const lines = payoutToJournalLines(payout('p1', 40000));
      expect(lines).toHaveLength(2);
      const [debit, credit] = lines;
      expect(debit.account).toBe(GL_DISBURSEMENT_DEBIT);
      expect(debit.debitCents).toBe(40000);
      expect(debit.creditCents).toBe(0);
      expect(credit.account).toBe(GL_BANK_CREDIT);
      expect(credit.creditCents).toBe(40000);
      expect(credit.debitCents).toBe(0);
      expect(debit.journalRef).toBe(credit.journalRef);
    });
  });

  describe('buildJournal', () => {
    it('is balanced (total debit == total credit)', () => {
      const result = buildJournal([payout('p1', 40000), payout('p2', 25000)]);
      expect(result.totalDebitCents).toBe(65000);
      expect(result.totalCreditCents).toBe(65000);
      expect(result.balanced).toBe(true);
      expect(result.lines).toHaveLength(4);
    });

    it('is balanced and empty for no payouts', () => {
      const result = buildJournal([]);
      expect(result.balanced).toBe(true);
      expect(result.lines).toHaveLength(0);
    });

    it('handles a null sentAt (empty date) and a string date', () => {
      const result = buildJournal([
        { payoutId: 'p1', campaignTitle: 'X', amountCents: 100, sentAt: null },
        {
          payoutId: 'p2',
          campaignTitle: 'Y',
          amountCents: 200,
          sentAt: '2026-06-20T10:00:00.000Z',
        },
      ]);
      expect(result.lines[0].date).toBe('');
      expect(result.lines[2].date).toBe('2026-06-20');
      expect(result.balanced).toBe(true);
    });
  });

  describe('journalToCsv', () => {
    it('renders header + one row per line', () => {
      const csv = journalToCsv(buildJournal([payout('p1', 40000)]));
      const rows = csv.trim().split('\n');
      expect(rows[0]).toBe(
        'Date,Journal,Account,Account Name,Debit,Credit,Memo',
      );
      expect(rows).toHaveLength(3); // header + 2 lines
      expect(csv).toContain('400.00');
      expect(csv).toContain('PO-p1');
    });

    it('escapes a memo containing a comma', () => {
      const csv = journalToCsv(
        buildJournal([
          {
            payoutId: 'p1',
            campaignTitle: 'Amara, Okonkwo',
            amountCents: 40000,
            sentAt: null,
          },
        ]),
      );
      expect(csv).toContain('"Tuition disbursement — Amara, Okonkwo"');
    });
  });
});
