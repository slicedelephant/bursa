import { SchoolWebhookService } from './school-webhook.service';
import { buildCampaignApprovedEvent } from './school-webhook-events';

function makePrisma() {
  return {
    schoolWebhookEvent: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('SchoolWebhookService', () => {
  const event = buildCampaignApprovedEvent('school1', {
    id: 'c1',
    title: 'MBA tuition',
    goalCents: 100_000,
  });

  it('persists the event payload', async () => {
    const prisma = makePrisma();
    const service = new SchoolWebhookService(prisma as never);
    await service.emit(event);
    expect(prisma.schoolWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: 'school1',
        type: 'campaign.approved',
        status: 'LOGGED',
      }),
    });
  });

  it('swallows persistence errors so the business flow is never broken', async () => {
    const prisma = makePrisma();
    prisma.schoolWebhookEvent.create.mockRejectedValueOnce(
      new Error('db down'),
    );
    const service = new SchoolWebhookService(prisma as never);
    await expect(service.emit(event)).resolves.toBeUndefined();
  });

  it('lists recent events for a school', async () => {
    const prisma = makePrisma();
    const service = new SchoolWebhookService(prisma as never);
    await service.list('school1');
    expect(prisma.schoolWebhookEvent.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school1' },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  });
});
