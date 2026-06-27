import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { assessPassword } from './password-policy';

/**
 * Boundary validation for account passwords. Rejects weak passwords at the DTO
 * layer (Constitution V) using the shared `assessPassword` heuristic; the error
 * message lists the concrete policy violations.
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return assessPassword(value).valid;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    const issues =
      typeof value === 'string' ? assessPassword(value).issues : ['Invalid password.'];
    return issues.join(' ');
  }
}

export function IsStrongPassword(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
