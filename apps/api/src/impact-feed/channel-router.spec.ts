import { messengerChannels, routeChannels } from './channel-router';

describe('routeChannels', () => {
  it('always includes IN_APP even with no preferences', () => {
    expect(routeChannels([])).toEqual(['IN_APP']);
  });

  it('always includes IN_APP even when explicitly opted out', () => {
    const res = routeChannels([{ channel: 'IN_APP', optIn: false }]);
    expect(res).toEqual(['IN_APP']);
  });

  it('adds only the opted-in non-in-app channels', () => {
    const res = routeChannels([
      { channel: 'IN_APP', optIn: true },
      { channel: 'WHATSAPP', optIn: true, handle: '+49' },
      { channel: 'TELEGRAM', optIn: false },
      { channel: 'EMAIL', optIn: true },
    ]);
    expect(res).toEqual(['IN_APP', 'WHATSAPP', 'EMAIL']);
  });

  it('does not duplicate IN_APP if it appears opted-in', () => {
    const res = routeChannels([{ channel: 'IN_APP', optIn: true }]);
    expect(res).toEqual(['IN_APP']);
  });

  it('does not mutate the input array', () => {
    const prefs = [{ channel: 'WHATSAPP' as const, optIn: true, handle: 'h' }];
    const copy = [...prefs];
    routeChannels(prefs);
    expect(prefs).toEqual(copy);
  });
});

describe('messengerChannels', () => {
  it('returns only opted-in external channels that have a handle', () => {
    const res = messengerChannels([
      { channel: 'IN_APP', optIn: true },
      { channel: 'EMAIL', optIn: true, handle: 'x@y.z' },
      { channel: 'WHATSAPP', optIn: true, handle: '+4915112345678' },
      { channel: 'TELEGRAM', optIn: true, handle: '' },
      { channel: 'MESSENGER', optIn: false, handle: 'm' },
      { channel: 'PUSH', optIn: true, handle: 'device-token' },
    ]);
    expect(res).toEqual([
      { channel: 'WHATSAPP', handle: '+4915112345678' },
      { channel: 'PUSH', handle: 'device-token' },
    ]);
  });

  it('excludes opted-in channels without a handle', () => {
    const res = messengerChannels([
      { channel: 'WHATSAPP', optIn: true },
      { channel: 'TELEGRAM', optIn: true, handle: null },
    ]);
    expect(res).toEqual([]);
  });

  it('excludes EMAIL even with a handle (it is not a messenger channel)', () => {
    const res = messengerChannels([
      { channel: 'EMAIL', optIn: true, handle: 'a@b.c' },
    ]);
    expect(res).toEqual([]);
  });
});
