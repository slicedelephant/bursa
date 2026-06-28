import { toEmbed } from './video-embed';

describe('toEmbed', () => {
  it('builds a privacy-friendly youtube embed from a youtu.be link', () => {
    expect(toEmbed('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('builds an embed from a youtube watch URL with extra params', () => {
    expect(toEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')?.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('builds an embed from a youtube /shorts/ URL', () => {
    expect(toEmbed('https://youtube.com/shorts/dQw4w9WgXcQ')?.provider).toBe('youtube');
  });

  it('builds a vimeo player embed', () => {
    expect(toEmbed('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
  });

  it('returns null for an unsupported host', () => {
    expect(toEmbed('https://example.com/clip')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(toEmbed('nope')).toBeNull();
  });

  it('returns null for null/empty input', () => {
    expect(toEmbed(null)).toBeNull();
    expect(toEmbed('')).toBeNull();
  });
});
