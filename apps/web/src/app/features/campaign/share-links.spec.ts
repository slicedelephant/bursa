import { buildShareLinks, campaignUrl, originOf, shareMessage } from './share-links';

const base = {
  url: 'https://bursa.test/campaigns/c1',
  studentName: 'Amara Okonkwo',
  title: 'From Lagos fintech to a Berlin MBA',
};

describe('shareMessage', () => {
  it('names the student and the campaign title in English by default', () => {
    const msg = shareMessage(base);
    expect(msg).toContain('Amara Okonkwo');
    expect(msg).toContain('From Lagos fintech to a Berlin MBA');
  });

  it('does not embed the raw url (that is added per channel)', () => {
    expect(shareMessage(base)).not.toContain(base.url);
  });

  it('produces a German message with real umlauts', () => {
    const msg = shareMessage({ ...base, lang: 'de' });
    expect(msg).toContain('Unterstütze');
    expect(msg).not.toContain('Unterstuetze');
  });

  it('uses the first-backers framing when requested', () => {
    const en = shareMessage({ ...base, firstBackers: true });
    expect(en.toLowerCase()).toContain('first');
    const de = shareMessage({ ...base, lang: 'de', firstBackers: true });
    expect(de.toLowerCase()).toContain('erste');
  });
});

describe('buildShareLinks', () => {
  const links = buildShareLinks(base);

  it('builds a wa.me deeplink whose text contains the campaign url', () => {
    expect(links.whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(links.whatsapp.split('text=')[1]);
    expect(text).toContain(base.url);
    expect(text).toContain('Amara Okonkwo');
  });

  it('builds a telegram share deeplink with separate url and text params', () => {
    expect(links.telegram.startsWith('https://t.me/share/url?')).toBe(true);
    expect(links.telegram).toContain('url=' + encodeURIComponent(base.url));
    expect(links.telegram).toContain('text=');
  });

  it('builds a facebook sharer deeplink with the encoded url', () => {
    expect(links.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(base.url),
    );
  });
});

describe('campaignUrl', () => {
  it('joins an origin and a campaign id without a double slash', () => {
    expect(campaignUrl('https://bursa.test', 'c1')).toBe('https://bursa.test/campaigns/c1');
    expect(campaignUrl('https://bursa.test/', 'c1')).toBe('https://bursa.test/campaigns/c1');
  });
});

describe('originOf', () => {
  it('uses the location origin when present', () => {
    expect(originOf({ origin: 'https://app.example' })).toBe('https://app.example');
  });

  it('falls back to a default origin when location is missing', () => {
    expect(originOf(null)).toBe('https://bursa.app');
    expect(originOf({})).toBe('https://bursa.app');
  });
});
