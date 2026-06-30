import { comparePeers } from './peer-comparison.util';

describe('comparePeers', () => {
  it('reports being ahead of the average', () => {
    const res = comparePeers(5, [1, 2, 2, 3, 5]);
    // average = 13 / 5 = 2.6
    expect(res.peerAverage).toBe(2.6);
    expect(res.yourValue).toBe(5);
    expect(res.ratio).toBe(1.92);
    expect(res.ahead).toBe(true);
  });

  it('rounds the average to one decimal', () => {
    const res = comparePeers(2, [1, 1, 2]);
    // average = 4 / 3 = 1.333 -> 1.3
    expect(res.peerAverage).toBe(1.3);
  });

  it('treats meeting the average as ahead', () => {
    const res = comparePeers(2, [2, 2, 2]);
    expect(res.ahead).toBe(true);
    expect(res.ratio).toBe(1);
  });

  it('reports being below the average', () => {
    const res = comparePeers(1, [4, 4, 4]);
    expect(res.ahead).toBe(false);
    expect(res.ratio).toBeLessThan(1);
  });

  it('handles an empty population without dividing by zero', () => {
    const res = comparePeers(3, []);
    expect(res.peerAverage).toBe(0);
    expect(res.ratio).toBe(0);
    expect(res.ahead).toBe(true);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    const snapshot = JSON.stringify(input);
    comparePeers(2, input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
