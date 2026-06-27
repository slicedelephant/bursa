import { AccountService } from './account.service';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

function makeDeps(user: Record<string, unknown> | null) {
  const tx = {
    user: { update: jest.fn().mockResolvedValue({}) },
    donation: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn(),
    },
    donation: { findMany: jest.fn().mockResolvedValue([{ id: 'd1' }]) },
    recurringPledge: { findMany: jest.fn().mockResolvedValue([]) },
    updateSubscription: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService & Record<string, any>;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService & {
    record: jest.Mock;
  };
  return { prisma, audit, tx };
}

const USER = {
  id: 'u1',
  email: 'jane@example.com',
  role: 'DONOR',
  displayName: 'Jane',
  anonymizedAt: null,
  createdAt: new Date('2026-01-01'),
};

describe('AccountService.exportData', () => {
  it('returns the user data and records an audit entry', async () => {
    const { prisma, audit } = makeDeps(USER);
    const service = new AccountService(prisma, audit);
    const out = await service.exportData('u1', '1.2.3.4');
    expect(out.user.email).toBe('jane@example.com');
    expect(out.donations).toEqual([{ id: 'd1' }]);
    expect(out.exportedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'account.export', actorUserId: 'u1' }),
    );
  });

  it('throws 404 for an unknown user', async () => {
    const { prisma, audit } = makeDeps(null);
    const service = new AccountService(prisma, audit);
    await expect(service.exportData('missing')).rejects.toMatchObject({
      message: 'User not found',
    });
  });
});

describe('AccountService.anonymize', () => {
  it('scrubs user PII and nulls donation PII, keeping the money trail', async () => {
    const { prisma, audit, tx } = makeDeps(USER);
    const service = new AccountService(prisma, audit);
    const out = await service.anonymize('u1', '1.2.3.4');

    expect(out.anonymized).toBe(true);
    const userUpdate = tx.user.update.mock.calls[0][0];
    expect(userUpdate.data.email).toBe('deleted+u1@bursa.invalid');
    expect(userUpdate.data.displayName).toBe('Deleted user');
    expect(userUpdate.data.anonymizedAt).toBeInstanceOf(Date);

    const donationUpdate = tx.donation.updateMany.mock.calls[0][0];
    expect(donationUpdate.where).toEqual({ donorUserId: 'u1' });
    expect(donationUpdate.data).toMatchObject({ donorName: null, message: null });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'account.delete', actorUserId: 'u1' }),
    );
  });

  it('is idempotent for an already anonymised account', async () => {
    const already = { ...USER, anonymizedAt: new Date('2026-02-02') };
    const { prisma, audit, tx } = makeDeps(already);
    const service = new AccountService(prisma, audit);
    const out = await service.anonymize('u1');
    expect(out.anonymizedAt).toEqual(already.anonymizedAt);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('throws 404 for an unknown user', async () => {
    const { prisma, audit } = makeDeps(null);
    const service = new AccountService(prisma, audit);
    await expect(service.anonymize('missing')).rejects.toMatchObject({
      message: 'User not found',
    });
  });
});
