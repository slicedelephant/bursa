import {
  formatLocalBankDetail,
  formatVirtualIban,
  validateVirtualIban,
} from './local-bank-detail';

// mod-97-valid sample virtual IBANs (display-only, not real accounts).
const VALID_KE = 'KE12ABC12345678';
const VALID_NG = 'NG75BANK000112223334';

describe('validateVirtualIban (E20)', () => {
  it('accepts a well-formed, checksum-valid IBAN', () => {
    expect(validateVirtualIban(VALID_KE)).toBe(true);
    expect(validateVirtualIban(VALID_NG)).toBe(true);
  });

  it('accepts a spaced IBAN (normalizes first)', () => {
    expect(validateVirtualIban('KE12 ABC1 2345 678')).toBe(true);
  });

  it('rejects a wrong checksum', () => {
    expect(validateVirtualIban('KE120BC12345678')).toBe(false);
  });

  it('rejects a too-short value', () => {
    expect(validateVirtualIban('KE12ABC')).toBe(false);
  });

  it('rejects a malformed prefix', () => {
    expect(validateVirtualIban('1234ABC12345678')).toBe(false);
  });
});

describe('formatVirtualIban (E20)', () => {
  it('groups into blocks of four', () => {
    expect(formatVirtualIban(VALID_KE)).toBe('KE12 ABC1 2345 678');
  });
});

describe('formatLocalBankDetail (E20)', () => {
  it('builds a valid view with a good IBAN', () => {
    const view = formatLocalBankDetail({
      country: 'ke',
      currency: 'KES',
      bankName: '  Equity Bank ',
      accountNumber: ' 01234567890 ',
      virtualIban: VALID_KE,
    });
    expect(view.country).toBe('KE');
    expect(view.bankName).toBe('Equity Bank');
    expect(view.accountNumber).toBe('01234567890');
    expect(view.virtualIban).toBe('KE12 ABC1 2345 678');
    expect(view.valid).toBe(true);
  });

  it('is valid when no IBAN is provided', () => {
    const view = formatLocalBankDetail({
      country: 'KE',
      currency: 'KES',
      bankName: 'Equity',
      accountNumber: '01234567890',
      virtualIban: null,
    });
    expect(view.virtualIban).toBeNull();
    expect(view.valid).toBe(true);
  });

  it('is invalid when the IBAN fails the checksum', () => {
    const view = formatLocalBankDetail({
      country: 'KE',
      currency: 'KES',
      bankName: 'Equity',
      accountNumber: '01234567890',
      virtualIban: 'KE120BC12345678',
    });
    expect(view.valid).toBe(false);
  });
});
