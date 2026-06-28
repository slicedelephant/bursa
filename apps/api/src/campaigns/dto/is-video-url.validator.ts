import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isEmbeddableVideoUrl } from '../video-url.util';

/**
 * Boundary validation for pitch-video links: only accept URLs we can turn into a
 * YouTube/Vimeo embed. Empty/undefined is left to `@IsOptional`.
 */
@ValidatorConstraint({ name: 'isEmbeddableVideoUrl', async: false })
export class IsEmbeddableVideoUrlConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return isEmbeddableVideoUrl(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a YouTube or Vimeo video link`;
  }
}

export function IsEmbeddableVideoUrl(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsEmbeddableVideoUrlConstraint,
    });
  };
}
