import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

/**
 * GDPR self-service: data export (right of access / portability) and account
 * deletion via anonymisation. Deletion scrubs personal data but deliberately
 * preserves the immutable money/audit trail (Constitution II): donations,
 * invoices and audit entries survive while their PII fields are nulled.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Returns the authenticated user's own data as a structured export. */
  async exportData(userId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainException('NOT_FOUND', 'User not found', 404);

    const [donations, recurringPledges, subscriptions] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorUserId: userId },
        select: {
          id: true,
          amountCents: true,
          tipCents: true,
          currency: true,
          status: true,
          method: true,
          campaignId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recurringPledge.findMany({ where: { donorUserId: userId } }),
      this.prisma.updateSubscription.findMany({
        where: { donorUserId: userId },
      }),
    ]);

    await this.audit.record({
      action: 'account.export',
      actorUserId: userId,
      ip,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      donations,
      recurringPledges,
      subscriptions,
      exportedAt: new Date(),
    };
  }

  /**
   * Anonymises the account: scrubs email/name/password and nulls PII on the
   * user's own donations, keeping financial records intact. Idempotent — a
   * second call on an already-anonymised account is a no-op success.
   */
  async anonymize(userId: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainException('NOT_FOUND', 'User not found', 404);

    if (user.anonymizedAt) {
      return { anonymized: true, anonymizedAt: user.anonymizedAt };
    }

    const deadHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    const anonymizedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted+${userId}@bursa.invalid`,
          displayName: 'Deleted user',
          passwordHash: deadHash,
          anonymizedAt,
        },
      });
      await tx.donation.updateMany({
        where: { donorUserId: userId },
        data: { donorName: null, message: null, anonymous: true },
      });
    });

    await this.audit.record({
      action: 'account.delete',
      actorUserId: userId,
      targetType: 'User',
      targetId: userId,
      ip,
    });

    return { anonymized: true, anonymizedAt };
  }
}
