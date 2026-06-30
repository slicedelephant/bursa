// Pure share helpers for the referral/advocate engine (E15). Reuses the E3 share
// toolkit's deeplink builder (buildShareLinks) for WhatsApp/Telegram, and adds an
// email mailto plus the pre-filled body that the backend ShareTemplates carry. No
// I/O; returns new values, never mutates inputs.

import { buildShareLinks } from '../campaign/share-links';
import { ShareTemplate, ShareTemplates } from '../../core/models';

export interface ChannelLink {
  readonly channel: 'whatsapp' | 'telegram' | 'email';
  readonly label: string;
  readonly href: string;
}

/**
 * One-tap channel links for a referral/advocate share. WhatsApp/Telegram come from
 * the E3 deeplink builder; email is a mailto with the backend-provided subject/body.
 */
export function referralShareLinks(
  shareUrl: string,
  name: string,
  templates: ShareTemplates,
): ChannelLink[] {
  const deeplinks = buildShareLinks({
    url: shareUrl,
    studentName: name,
    title: 'Bursa',
  });
  return [
    { channel: 'whatsapp', label: 'WhatsApp', href: deeplinks.whatsapp },
    { channel: 'telegram', label: 'Telegram', href: deeplinks.telegram },
    { channel: 'email', label: 'Email', href: mailtoHref(templates.email) },
  ];
}

/** A mailto: href from an email ShareTemplate (subject + body url-encoded). */
export function mailtoHref(email: ShareTemplate): string {
  const subject = encodeURIComponent(email.subject ?? '');
  const body = encodeURIComponent(email.body);
  return `mailto:?subject=${subject}&body=${body}`;
}
