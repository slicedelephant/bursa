import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * "Email" in this prototype is NOT sent over SMTP. Instead each email is
 * persisted as an EMAIL-channel Notification row (emailLogged = true) and
 * counted in-memory, so the email side-effect is fully observable in tests and
 * the DB without any external infrastructure.
 */
export interface LoggedEmail {
  readonly userId: string;
  readonly title: string;
  readonly at: Date;
}

export interface EmailInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  campaignId?: string | null;
}

@Injectable()
export class EmailLogger {
  private readonly sentLog: LoggedEmail[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async log(input: EmailInput) {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: 'EMAIL',
        title: input.title,
        body: input.body,
        campaignId: input.campaignId ?? null,
        emailLogged: true,
      },
    });
    this.sentLog.push({
      userId: input.userId,
      title: input.title,
      at: new Date(),
    });
    return row;
  }

  get count(): number {
    return this.sentLog.length;
  }

  recent(n = 10): LoggedEmail[] {
    return this.sentLog.slice(-n);
  }
}
