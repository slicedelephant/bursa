import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class Dto {
  @IsStrongPassword()
  password!: string;
}

async function errorsFor(password: unknown): Promise<number> {
  const dto = new Dto();
  (dto as { password: unknown }).password = password;
  const errors = await validate(dto);
  return errors.length;
}

describe('IsStrongPassword', () => {
  it('passes a strong password', async () => {
    expect(await errorsFor('Tr0ubadour-Xy!')).toBe(0);
  });

  it('fails a weak password', async () => {
    expect(await errorsFor('weak')).toBeGreaterThan(0);
  });

  it('fails a non-string value', async () => {
    expect(await errorsFor(12345678)).toBeGreaterThan(0);
  });

  it('surfaces the policy issues in the message', async () => {
    const dto = new Dto();
    dto.password = 'lowercaseonly';
    const errors = await validate(dto);
    const message = Object.values(errors[0].constraints ?? {}).join(' ');
    expect(message).toContain('uppercase');
  });
});
