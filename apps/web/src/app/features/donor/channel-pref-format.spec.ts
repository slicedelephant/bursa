import { channelMeta, channelStatusText } from './channel-pref-format';

describe('channelMeta', () => {
  it('marks IN_APP as locked and needing no handle', () => {
    const meta = channelMeta('IN_APP');
    expect(meta.locked).toBe(true);
    expect(meta.needsHandle).toBe(false);
    expect(meta.label).toBe('In-app feed');
  });

  it('marks messenger channels as needing a handle', () => {
    expect(channelMeta('WHATSAPP').needsHandle).toBe(true);
    expect(channelMeta('TELEGRAM').needsHandle).toBe(true);
    expect(channelMeta('MESSENGER').needsHandle).toBe(true);
    expect(channelMeta('PUSH').needsHandle).toBe(true);
  });

  it('marks email as unlocked and handle-free', () => {
    const meta = channelMeta('EMAIL');
    expect(meta.locked).toBe(false);
    expect(meta.needsHandle).toBe(false);
  });
});

describe('channelStatusText', () => {
  it('always shows IN_APP as always on', () => {
    expect(channelStatusText('IN_APP', false)).toBe('Always on');
  });

  it('shows On/Off for other channels by opt-in', () => {
    expect(channelStatusText('WHATSAPP', true)).toBe('On');
    expect(channelStatusText('WHATSAPP', false)).toBe('Off');
  });
});
