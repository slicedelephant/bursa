import { isEmbeddableVideoUrl, parseVideoUrl } from './video-url.util';

describe('parseVideoUrl', () => {
  it('parses a youtu.be short link', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('parses a standard youtube watch URL with extra params', () => {
    const r = parseVideoUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    );
    expect(r?.provider).toBe('youtube');
    expect(r?.id).toBe('dQw4w9WgXcQ');
  });

  it('parses a youtube /embed/ URL', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')?.id).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('parses a youtube /shorts/ URL', () => {
    expect(parseVideoUrl('https://youtube.com/shorts/dQw4w9WgXcQ')?.id).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('parses an m.youtube.com URL', () => {
    expect(
      parseVideoUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')?.provider,
    ).toBe('youtube');
  });

  it('parses a vimeo URL into the player embed', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      id: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
  });

  it('parses a player.vimeo.com URL', () => {
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789')?.id).toBe(
      '123456789',
    );
  });

  it('returns null for a youtube URL without a valid 11-char id', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=short')).toBeNull();
  });

  it('returns null for a non-video host', () => {
    expect(parseVideoUrl('https://example.com/video/123')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(parseVideoUrl('not a url')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseVideoUrl('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseVideoUrl('  https://youtu.be/dQw4w9WgXcQ  ')?.id).toBe(
      'dQw4w9WgXcQ',
    );
  });
});

describe('isEmbeddableVideoUrl', () => {
  it('is true for a valid youtube link', () => {
    expect(isEmbeddableVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('is false for an unsupported link', () => {
    expect(isEmbeddableVideoUrl('https://example.com')).toBe(false);
  });
});
