import { AuditService } from './audit.service';
import { REDACTED } from './pii-redact';
import { PrismaService } from '../prisma/prisma.service';

function makePrisma() {
  return {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]),
    },
  } as unknown as PrismaService & {
    auditLog: { create: jest.Mock; findMany: jest.Mock };
  };
}

describe('AuditService', () => {
  it('persists an entry', async () => {
    const prisma = makePrisma();
    const service = new AuditService(prisma);
    await service.record({ action: 'auth.login', actorUserId: 'u1', ip: '1.2.3.4' });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const arg = prisma.auditLog.create.mock.calls[0][0];
    expect(arg.data.action).toBe('auth.login');
    expect(arg.data.actorUserId).toBe('u1');
  });

  it('redacts PII inside metadata before persisting', async () => {
    const prisma = makePrisma();
    const service = new AuditService(prisma);
    await service.record({
      action: 'auth.login_failed',
      metadata: { email: 'jane@example.com', attempt: 3 },
    });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.metadata.email).toBe(REDACTED);
    expect(data.metadata.attempt).toBe(3);
  });

  it('never throws when persistence fails (does not break the caller)', async () => {
    const prisma = makePrisma();
    prisma.auditLog.create.mockRejectedValueOnce(new Error('db down'));
    const service = new AuditService(prisma);
    await expect(service.record({ action: 'x' })).resolves.toBeUndefined();
  });

  it('lists with an optional action filter', async () => {
    const prisma = makePrisma();
    const service = new AuditService(prisma);
    await service.list('auth.login');
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { action: 'auth.login' } }),
    );
  });

  it('lists everything when no action is given', async () => {
    const prisma = makePrisma();
    const service = new AuditService(prisma);
    await service.list();
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});
