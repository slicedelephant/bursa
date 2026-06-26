import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain/business rule violation. Carries a stable machine-readable `code`
 * (see contracts/api.md error codes) plus a human message.
 */
export class DomainException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
