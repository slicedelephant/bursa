import { EmailLogger } from './email-logger';

describe('EmailLogger', () => {
  function build() {
    const prisma = {
      notification: { create: jest.fn().mockResolvedValue({ id: 'e1' }) },
    };
    return { prisma, logger: new EmailLogger(prisma as never) };
  }

  it('persists an EMAIL-channel notification and records it in memory', async () => {
    const { prisma, logger } = build();
    await logger.log({
      userId: 'u1',
      type: 'THANK_YOU',
      title: 'Thanks',
      body: 'Body',
      campaignId: 'c1',
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        channel: 'EMAIL',
        emailLogged: true,
        campaignId: 'c1',
      }),
    });
    expect(logger.count).toBe(1);
    expect(logger.recent()[0]).toMatchObject({ userId: 'u1', title: 'Thanks' });
  });

  it('defaults campaignId to null when omitted', async () => {
    const { prisma, logger } = build();
    await logger.log({ userId: 'u1', type: 'MILESTONE', title: 'T', body: 'B' });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ campaignId: null }),
    });
  });

  it('keeps a recent window of the sent log', async () => {
    const { logger } = build();
    for (let i = 0; i < 15; i++) {
      await logger.log({ userId: `u${i}`, type: 'IMPACT_UPDATE', title: `t${i}`, body: 'b' });
    }
    expect(logger.count).toBe(15);
    expect(logger.recent(5)).toHaveLength(5);
    expect(logger.recent(5)[4].title).toBe('t14');
  });
});
