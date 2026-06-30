import {
  AUTO_REFUND_MAX_CENTS,
  chargebackStatusClass,
  chargebackStatusLabel,
  refundEligible,
} from './chargeback-format';

describe('chargeback-format', () => {
  it('labels each chargeback status', () => {
    expect(chargebackStatusLabel('OPEN')).toBe('Open');
    expect(chargebackStatusLabel('EVIDENCE_SUBMITTED')).toBe('Evidence submitted');
    expect(chargebackStatusLabel('REFUND_OFFERED')).toBe('Refund offered');
    expect(chargebackStatusLabel('WON')).toBe('Won');
    expect(chargebackStatusLabel('LOST')).toBe('Lost');
  });

  it('classes each chargeback status', () => {
    expect(chargebackStatusClass('WON')).toContain('brand-green');
    expect(chargebackStatusClass('LOST')).toContain('brand-orange');
    expect(chargebackStatusClass('REFUND_OFFERED')).toContain('brand-blue');
    expect(chargebackStatusClass('EVIDENCE_SUBMITTED')).toContain('amber');
    expect(chargebackStatusClass('OPEN')).toContain('mist');
  });

  it('judges refund eligibility', () => {
    expect(refundEligible('OPEN', 2_000)).toBe(true);
    expect(refundEligible('OPEN', AUTO_REFUND_MAX_CENTS)).toBe(true);
    expect(refundEligible('OPEN', AUTO_REFUND_MAX_CENTS + 1)).toBe(false);
    expect(refundEligible('OPEN', 0)).toBe(false);
    expect(refundEligible('WON', 1_000)).toBe(false);
  });
});
