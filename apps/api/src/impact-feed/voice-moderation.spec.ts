import { MAX_VOICE_TEXT_LENGTH, moderateVoice } from './voice-moderation';

describe('moderateVoice', () => {
  it('approves a clean thank-you message', () => {
    const res = moderateVoice({
      text: 'Thank you so much for supporting my MBA journey.',
    });
    expect(res).toEqual({ decision: 'APPROVE', reasons: [] });
  });

  it('approves a clean message with valid media URLs', () => {
    const res = moderateVoice({
      text: 'A quick video update — thank you!',
      videoUrl: 'https://example.com/thanks.mp4',
      voiceUrl: 'https://example.com/note.ogg',
    });
    expect(res.decision).toBe('APPROVE');
  });

  it('rejects an empty message', () => {
    const res = moderateVoice({ text: '   ' });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('empty_text');
  });

  it('treats a missing text as empty', () => {
    const res = moderateVoice({ text: undefined as unknown as string });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('empty_text');
  });

  it('rejects a message that is too long', () => {
    const res = moderateVoice({ text: 'a'.repeat(MAX_VOICE_TEXT_LENGTH + 1) });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('text_too_long');
  });

  it('rejects a message containing a slur from the blocklist', () => {
    const res = moderateVoice({ text: 'you are an idiot' });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('slur:idiot');
  });

  it('rejects a message containing an E9 suspicious keyword', () => {
    const res = moderateVoice({
      text: 'guaranteed return if you double your money',
    });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons.some((r) => r.startsWith('suspicious_keyword:'))).toBe(
      true,
    );
  });

  it('rejects an invalid video URL', () => {
    const res = moderateVoice({
      text: 'Thanks!',
      videoUrl: 'ftp://example.com/x.mp4',
    });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('url_invalid:videoUrl');
  });

  it('rejects an invalid voice URL', () => {
    const res = moderateVoice({
      text: 'Thanks!',
      voiceUrl: 'not-a-url',
    });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons).toContain('url_invalid:voiceUrl');
  });

  it('ignores null/empty URLs', () => {
    const res = moderateVoice({
      text: 'Thanks!',
      videoUrl: null,
      voiceUrl: '',
    });
    expect(res.decision).toBe('APPROVE');
  });

  it('collects multiple reasons at once', () => {
    const res = moderateVoice({
      text: 'you idiot, this is a scammer',
      voiceUrl: 'bad',
    });
    expect(res.decision).toBe('REJECT');
    expect(res.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
