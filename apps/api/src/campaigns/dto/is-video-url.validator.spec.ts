import { validate } from 'class-validator';
import {
  IsEmbeddableVideoUrl,
  IsEmbeddableVideoUrlConstraint,
} from './is-video-url.validator';
import { IsOptional } from 'class-validator';

describe('IsEmbeddableVideoUrlConstraint', () => {
  const c = new IsEmbeddableVideoUrlConstraint();

  it('accepts a valid youtube link', () => {
    expect(c.validate('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects an unsupported link', () => {
    expect(c.validate('https://example.com/clip')).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(c.validate(42 as unknown)).toBe(false);
  });

  it('builds a helpful default message naming the property', () => {
    const msg = c.defaultMessage({ property: 'videoUrl' } as never);
    expect(msg).toContain('videoUrl');
    expect(msg).toContain('YouTube');
  });
});

class Dummy {
  @IsOptional()
  @IsEmbeddableVideoUrl()
  videoUrl?: string;
}

describe('@IsEmbeddableVideoUrl decorator', () => {
  it('passes validation when the link is a valid embed', async () => {
    const d = new Dummy();
    d.videoUrl = 'https://vimeo.com/123456789';
    expect(await validate(d)).toHaveLength(0);
  });

  it('passes validation when the field is omitted (optional)', async () => {
    expect(await validate(new Dummy())).toHaveLength(0);
  });

  it('fails validation for an unsupported link', async () => {
    const d = new Dummy();
    d.videoUrl = 'https://example.com/clip';
    const errors = await validate(d);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isEmbeddableVideoUrl).toContain('YouTube');
  });
});
