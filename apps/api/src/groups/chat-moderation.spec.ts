import { MAX_MESSAGE_LENGTH, moderateMessage } from './chat-moderation';

describe('moderateMessage', () => {
  it('approves a clean message', () => {
    const result = moderateMessage({ text: 'Great progress this week, team!' });
    expect(result).toEqual({ decision: 'APPROVE', reasons: [] });
  });

  it('rejects an empty message', () => {
    const result = moderateMessage({ text: '   ' });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons).toContain('empty_text');
  });

  it('rejects a message over the length limit', () => {
    const result = moderateMessage({
      text: 'a'.repeat(MAX_MESSAGE_LENGTH + 1),
    });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons).toContain('text_too_long');
  });

  it('rejects a message containing a slur (reusing the E9 normalizer)', () => {
    const result = moderateMessage({ text: 'you are an IDIOT!' });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons).toContain('slur:idiot');
  });

  it('rejects a message with an E9 suspicious keyword', () => {
    const result = moderateMessage({
      text: 'guaranteed return, double your money',
    });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons).toContain('suspicious_keyword:guaranteed return');
    expect(result.reasons).toContain('suspicious_keyword:double your money');
  });

  it('accumulates multiple reasons', () => {
    const result = moderateMessage({ text: 'stupid scammer wire transfer' });
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
