// Pure helpers for displaying a referral/advocate link. No I/O; returns new values,
// never mutates inputs.

/** Short, human-friendly form of a share URL for display (drops the scheme). */
export function displayLink(shareUrl: string): string {
  return shareUrl.replace(/^https?:\/\//, '');
}

/** The shareable text a donor can copy: a short caption plus the link. */
export function copyText(shareUrl: string): string {
  return `Support a student on Bursa — every euro goes directly to their school: ${shareUrl}`;
}
