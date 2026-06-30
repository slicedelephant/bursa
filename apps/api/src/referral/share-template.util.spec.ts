import { buildShareTemplates } from './share-template.util';

describe('share-template.util', () => {
  describe('advocate face', () => {
    const templates = buildShareTemplates({
      url: 'https://bursa.app/r/abc',
      name: 'Amara',
      face: 'advocate',
      campaignTitle: 'INSEAD MBA 2026',
    });

    it('builds all three channels', () => {
      expect(Object.keys(templates).sort()).toEqual([
        'email',
        'linkedin',
        'whatsapp',
      ]);
    });

    it('includes the url and campaign title in the body', () => {
      expect(templates.whatsapp.body).toContain('https://bursa.app/r/abc');
      expect(templates.whatsapp.body).toContain('INSEAD MBA 2026');
      expect(templates.whatsapp.body).toContain('Amara');
    });

    it('reinforces the money-to-school compliance message', () => {
      expect(templates.email.body).toContain('directly to the business school');
    });

    it('gives email a subject; whatsapp/linkedin have none', () => {
      expect(templates.email.subject).toBe(
        'Help a student reach their tuition goal',
      );
      expect(templates.whatsapp.subject).toBeUndefined();
      expect(templates.linkedin.subject).toBeUndefined();
    });

    it('omits the title gracefully when not provided', () => {
      const t = buildShareTemplates({
        url: 'https://bursa.app/r/x',
        name: 'Amara',
        face: 'advocate',
      });
      expect(t.whatsapp.body).toContain("Amara's campaign on Bursa");
    });
  });

  describe('referral face', () => {
    const templates = buildShareTemplates({
      url: 'https://bursa.app/r/xyz',
      name: 'Generous Donor',
      face: 'referral',
    });

    it('frames a both-win badge unlock', () => {
      expect(templates.whatsapp.body).toContain(
        'both unlock a supporter badge',
      );
      expect(templates.whatsapp.body).toContain('https://bursa.app/r/xyz');
    });

    it('uses the inviter name in the email subject', () => {
      expect(templates.email.subject).toBe(
        'Generous Donor invited you to support a student on Bursa',
      );
    });
  });
});
