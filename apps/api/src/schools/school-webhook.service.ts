import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolWebhookEnvelope } from './school-webhook-events';

/**
 * Stub school-webhook emitter (E8). Persists the event + structured-logs it.
 * Real HTTP delivery/retries/signing are out of scope. A failure to log a
 * webhook must never break the underlying business operation.
 */
@Injectable()
export class SchoolWebhookService {
  private readonly logger = new Logger('SchoolWebhook');

  constructor(private readonly prisma: PrismaService) {}

  async emit(event: SchoolWebhookEnvelope): Promise<void> {
    try {
      await this.prisma.schoolWebhookEvent.create({
        data: {
          schoolId: event.schoolId,
          type: event.type,
          status: 'LOGGED',
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });
      this.logger.log(`emitted ${event.type} for school ${event.schoolId}`);
    } catch (error) {
      this.logger.warn(
        `failed to emit ${event.type} for school ${event.schoolId}: ${(error as Error).message}`,
      );
    }
  }

  list(schoolId: string, take = 25) {
    return this.prisma.schoolWebhookEvent.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
