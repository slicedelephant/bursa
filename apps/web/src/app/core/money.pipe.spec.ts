import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formats integer cents as whole euros by default', () => {
    expect(pipe.transform(150000)).toBe('€1,500');
  });

  it('treats null and undefined as zero', () => {
    expect(pipe.transform(null)).toBe('€0');
    expect(pipe.transform(undefined)).toBe('€0');
  });

  it('shows cents when decimals is true', () => {
    expect(pipe.transform(150099, true)).toBe('€1,500.99');
  });

  it('omits cents when decimals is false', () => {
    expect(pipe.transform(150099, false)).toBe('€1,501');
  });
});
