import { percentOf } from './campaign.mapper';

describe('percentOf', () => {
  it('computes a normal percentage', () => {
    expect(percentOf(5000, 10000)).toBe(50);
  });

  it('caps at 100 when over-funded', () => {
    expect(percentOf(20000, 10000)).toBe(100);
  });

  it('returns 0 for a zero or negative goal', () => {
    expect(percentOf(100, 0)).toBe(0);
  });

  it('rounds to the nearest whole percent', () => {
    expect(percentOf(3333, 10000)).toBe(33);
  });
});
