import { CampaignsService } from './campaigns.service';

/** Minimal Prisma double with the methods the service touches. */
function buildPrisma(over: Record<string, unknown> = {}) {
  return {
    studentProfile: { findUnique: jest.fn() },
    school: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    ...over,
  };
}

describe('CampaignsService — story/video fields', () => {
  it('persists videoUrl and the guided story blocks on create', async () => {
    const prisma = buildPrisma();
    prisma.studentProfile.findUnique.mockResolvedValue({
      id: 'sp1',
      campaign: null,
    });
    prisma.school.findUnique.mockResolvedValue({ id: 's1' });
    prisma.campaign.create.mockImplementation((args: { data: unknown }) => ({
      id: 'c1',
      ...(args.data as object),
    }));

    const service = new CampaignsService(prisma as never);
    await service.createForUser('u1', {
      schoolId: 's1',
      programName: 'MBA',
      title: 'Help me study',
      story: 'A composed story long enough to pass validation.',
      goalCents: 100000,
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      storyBackground: 'Where I am from',
      storyChallenge: 'The gap',
      storyVision: 'Where this takes me',
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
          storyBackground: 'Where I am from',
          storyChallenge: 'The gap',
          storyVision: 'Where this takes me',
        }),
      }),
    );
  });

  it('defaults the new fields to null when omitted on create', async () => {
    const prisma = buildPrisma();
    prisma.studentProfile.findUnique.mockResolvedValue({
      id: 'sp1',
      campaign: null,
    });
    prisma.school.findUnique.mockResolvedValue({ id: 's1' });
    prisma.campaign.create.mockResolvedValue({ id: 'c1' });

    const service = new CampaignsService(prisma as never);
    await service.createForUser('u1', {
      schoolId: 's1',
      programName: 'MBA',
      title: 'Help me study',
      story: 'A composed story long enough to pass validation.',
      goalCents: 100000,
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          videoUrl: null,
          storyBackground: null,
          storyChallenge: null,
          storyVision: null,
        }),
      }),
    );
  });

  it('updates only the provided story/video fields on a draft', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c1',
      status: 'DRAFT',
      studentProfile: { userId: 'u1' },
    });
    prisma.campaign.update.mockResolvedValue({ id: 'c1' });

    const service = new CampaignsService(prisma as never);
    await service.updateForUser('u1', 'c1', {
      videoUrl: 'https://vimeo.com/123456789',
      storyVision: 'New vision',
    });

    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        videoUrl: 'https://vimeo.com/123456789',
        storyVision: 'New vision',
      },
    });
  });
});
