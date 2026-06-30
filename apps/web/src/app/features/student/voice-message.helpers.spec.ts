import {
  MAX_VOICE_TEXT_LENGTH,
  charsRemaining,
  moderationHint,
  validateVoiceDraft,
} from './voice-message.helpers';

describe('validateVoiceDraft', () => {
  it('accepts a clean message', () => {
    const res = validateVoiceDraft({ text: 'Thank you for your support!' });
    expect(res).toEqual({ valid: true, errors: [] });
  });

  it('accepts valid media URLs', () => {
    const res = validateVoiceDraft({
      text: 'Thanks',
      videoUrl: 'https://example.com/v.mp4',
      voiceUrl: 'https://example.com/v.ogg',
    });
    expect(res.valid).toBe(true);
  });

  it('rejects an empty message', () => {
    const res = validateVoiceDraft({ text: '   ' });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('short message');
  });

  it('rejects an over-long message', () => {
    const res = validateVoiceDraft({ text: 'a'.repeat(MAX_VOICE_TEXT_LENGTH + 1) });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('characters'))).toBe(true);
  });

  it('rejects invalid media URLs', () => {
    const res = validateVoiceDraft({
      text: 'Thanks',
      videoUrl: 'ftp://x',
      voiceUrl: 'not-a-url',
    });
    expect(res.valid).toBe(false);
    expect(res.errors).toHaveLength(2);
  });
});

describe('charsRemaining', () => {
  it('counts down from the max', () => {
    expect(charsRemaining('')).toBe(MAX_VOICE_TEXT_LENGTH);
    expect(charsRemaining('hello')).toBe(MAX_VOICE_TEXT_LENGTH - 5);
  });
});

describe('moderationHint', () => {
  it('confirms an approved message', () => {
    expect(moderationHint([])).toContain('approved');
  });

  it('flags slurs, spam, bad URLs and length', () => {
    expect(moderationHint(['slur:idiot'])).toContain('offensive');
    expect(moderationHint(['suspicious_keyword:bitcoin'])).toContain('spam');
    expect(moderationHint(['url_invalid:videoUrl'])).toContain('valid URL');
    expect(moderationHint(['text_too_long'])).toContain('characters');
  });

  it('gives a generic hint for unknown reasons', () => {
    expect(moderationHint(['empty_text'])).toContain('revise');
  });
});
