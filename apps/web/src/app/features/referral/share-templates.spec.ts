import { ShareTemplates } from '../../core/models';
import { mailtoHref, referralShareLinks } from './share-templates';

const templates: ShareTemplates = {
  email: { subject: 'Help a student', body: 'Join via https://bursa.app/r/abc' },
  whatsapp: { body: 'wa body' },
  linkedin: { body: 'li body' },
};

describe('share-templates', () => {
  describe('referralShareLinks', () => {
    const links = referralShareLinks('https://bursa.app/r/abc', 'Amara', templates);

    it('returns whatsapp, telegram and email channels', () => {
      expect(links.map((l) => l.channel)).toEqual(['whatsapp', 'telegram', 'email']);
    });

    it('reuses the E3 deeplink builder for whatsapp (encodes the url)', () => {
      const wa = links.find((l) => l.channel === 'whatsapp')!;
      expect(wa.href).toContain('wa.me');
      expect(wa.href).toContain(encodeURIComponent('https://bursa.app/r/abc'));
    });

    it('builds a telegram share link', () => {
      const tg = links.find((l) => l.channel === 'telegram')!;
      expect(tg.href).toContain('t.me/share');
    });

    it('builds a mailto with the backend subject + body', () => {
      const email = links.find((l) => l.channel === 'email')!;
      expect(email.href).toContain('mailto:?subject=');
      expect(email.href).toContain(encodeURIComponent('Help a student'));
    });
  });

  describe('mailtoHref', () => {
    it('url-encodes subject and body', () => {
      expect(mailtoHref({ subject: 'a b', body: 'c&d' })).toBe('mailto:?subject=a%20b&body=c%26d');
    });

    it('tolerates a missing subject', () => {
      expect(mailtoHref({ body: 'hi' })).toBe('mailto:?subject=&body=hi');
    });
  });
});
