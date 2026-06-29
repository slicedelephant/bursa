import { SchoolAdmissionsService } from './school-admissions.service';
import { MockRegistrarProvider } from './mock-registrar.provider';

function buildPrisma() {
  const admissionRecord = {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'r1', studentName: 'Amara', admissionRef: 'ADM-1', ...data }),
    ),
  };
  return {
    school: { findUnique: jest.fn().mockResolvedValue({ id: 's1', name: 'ESMT' }) },
    admissionRecord,
    $transaction: jest.fn().mockImplementation((ops) => Promise.resolve(ops)),
  };
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const webhooks = { emit: jest.fn().mockResolvedValue(undefined) };
  const service = new SchoolAdmissionsService(
    prisma as never,
    new MockRegistrarProvider(),
    webhooks as never,
  );
  return { service, webhooks };
}

const csv = ['email,name,program,admissionRef', 'a@bursa.test,Amara,MBA,ADM-1'].join('\n');

describe('SchoolAdmissionsService', () => {
  it('imports a CSV and upserts each record idempotently', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    const result = await service.import('s1', csv);
    expect(result.imported).toBe(1);
    expect(prisma.admissionRecord.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns parse errors without touching the DB', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    const result = await service.import('s1', 'email,name\nx@y.z,Bob');
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists records, optionally filtered by status', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.list('s1', 'PENDING');
    expect(prisma.admissionRecord.findMany).toHaveBeenCalledWith({
      where: { schoolId: 's1', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('lists all records when no status filter is given', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.list('s1');
    expect(prisma.admissionRecord.findMany).toHaveBeenCalledWith({
      where: { schoolId: 's1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('verifies a record when the registrar recognises it and emits a webhook', async () => {
    const prisma = buildPrisma();
    prisma.admissionRecord.findFirst.mockResolvedValue({ id: 'r1', schoolId: 's1', admissionRef: 'ADM-1', studentName: 'Amara' });
    const { service, webhooks } = makeService(prisma);
    const updated = await service.verify('s1', 'r1', 'admin1');
    expect(updated.status).toBe('VERIFIED');
    expect(webhooks.emit).toHaveBeenCalled();
  });

  it('blocks verification when the registrar does not recognise the ref', async () => {
    const prisma = buildPrisma();
    prisma.admissionRecord.findFirst.mockResolvedValue({ id: 'r1', schoolId: 's1', admissionRef: 'ADM-1-UNKNOWN', studentName: 'Amara' });
    const { service } = makeService(prisma);
    await expect(service.verify('s1', 'r1', 'admin1')).rejects.toMatchObject({
      response: { code: 'ADMISSION_NOT_ON_FILE' },
    });
  });

  it('rejects a record with a reason and emits a webhook', async () => {
    const prisma = buildPrisma();
    prisma.admissionRecord.findFirst.mockResolvedValue({ id: 'r1', schoolId: 's1', admissionRef: 'ADM-1', studentName: 'Amara' });
    const { service, webhooks } = makeService(prisma);
    const updated = await service.reject('s1', 'r1', 'admin1', 'No proof');
    expect(updated.status).toBe('REJECTED');
    expect(updated.note).toBe('No proof');
    expect(webhooks.emit).toHaveBeenCalled();
  });

  it('throws when the record is missing or not in this school', async () => {
    const prisma = buildPrisma();
    prisma.admissionRecord.findFirst.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(service.reject('s1', 'missing', 'admin1', 'x')).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});
