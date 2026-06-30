// Pure share-template builder (E15). Produces pre-filled, copy-paste-ready invite
// texts for email / WhatsApp / LinkedIn for both faces of the engine (advocate invites
// and donor referrals). The backend mirror of the E3 front-end share toolkit — there is
// no real email sending; an invite just yields a link + these templates. No I/O;
// returns new objects; never mutates inputs.

export type ShareChannel = 'email' | 'whatsapp' | 'linkedin';
export type ShareFace = 'advocate' | 'referral';

export interface ShareTemplateInput {
  /** Shareable referral/advocate URL. */
  readonly url: string;
  /** Student name (advocate face) or the inviter's display name (referral face). */
  readonly name: string;
  readonly face: ShareFace;
  /** Campaign title — used on the advocate face for a more specific message. */
  readonly campaignTitle?: string;
}

export interface ShareTemplate {
  /** Present for email only. */
  readonly subject?: string;
  readonly body: string;
}

export type ShareTemplates = Record<ShareChannel, ShareTemplate>;

function advocateBody(
  name: string,
  title: string | undefined,
  url: string,
): string {
  const what = title ? `${name}'s campaign "${title}"` : `${name}'s campaign`;
  return (
    `I'm backing ${what} on Bursa — verified, admitted MBA students raising tuition. ` +
    `Every euro goes directly to the business school, never to the student. ` +
    `Help spread the word: ${url}`
  );
}

function referralBody(name: string, url: string): string {
  return (
    `${name} invited you to Bursa, where verified students raise tuition that's paid ` +
    `directly to their business school. Make your first gift through this link and we ` +
    `both unlock a supporter badge: ${url}`
  );
}

export function buildShareTemplates(input: ShareTemplateInput): ShareTemplates {
  const body =
    input.face === 'advocate'
      ? advocateBody(input.name, input.campaignTitle, input.url)
      : referralBody(input.name, input.url);

  const subject =
    input.face === 'advocate'
      ? 'Help a student reach their tuition goal'
      : `${input.name} invited you to support a student on Bursa`;

  return {
    email: { subject, body },
    whatsapp: { body },
    linkedin: { body },
  };
}
