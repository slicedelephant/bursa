import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { redact } from './pii-redact';

export interface AuditEntry {
  action: string;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append-only access/security logging. Metadata is PII-redacted before it is
 * persisted so the audit trail itself never becomes a data-leak. Recording must
 * never break the calling business flow, so persistence failures are caught and
 * logged, not rethrown.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorUserId: entry.actorUserId ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          ip: entry.ip ?? null,
          metadata: entry.metadata
            ? (redact(entry.metadata) as object)
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry "${entry.action}"`,
        error as Error,
      );
    }
  }

  /** Lists recent audit entries, optionally filtered by action. */
  async list(action?: string, take = 50) {
    return this.prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
