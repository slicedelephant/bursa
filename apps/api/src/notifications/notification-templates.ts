import { NotificationType } from '@prisma/client';

/**
 * Pure notification copy builders — no I/O. Each returns a fresh
 * `{ type, title, body }` triple. Money is formatted to whole euros.
 */
export interface NotificationContent {
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
}

function eur(cents: number): string {
  return `€${new Intl.NumberFormat('en-US').format(Math.round(cents / 100))}`;
}

export function thankYouNotification(input: {
  studentName: string;
  amountCents: number;
}): NotificationContent {
  return {
    type: 'THANK_YOU',
    title: 'Thank you for your gift',
    body: `Your ${eur(input.amountCents)} gift toward ${input.studentName}'s tuition is on its way directly to the school. We'll keep you posted on the impact.`,
  };
}

export function milestoneNotification(input: {
  percent: number;
  studentName: string;
}): NotificationContent {
  if (input.percent >= 100) {
    return {
      type: 'GOAL_REACHED',
      title: `${input.studentName}'s campaign reached its goal!`,
      body: `Thanks to supporters like you, ${input.studentName} is fully funded — the tuition goes straight to the school.`,
    };
  }
  return {
    type: 'MILESTONE',
    title: `${input.percent}% funded`,
    body: `${input.studentName}'s campaign just passed ${input.percent}% of its tuition goal. The final stretch is where your support matters most.`,
  };
}

export function impactUpdateNotification(input: {
  studentName: string;
  updateTitle: string;
}): NotificationContent {
  return {
    type: 'IMPACT_UPDATE',
    title: `Update from ${input.studentName}: ${input.updateTitle}`,
    body: `${input.studentName} posted a new update on the campaign you support.`,
  };
}

export function recurringChargeNotification(input: {
  studentName: string;
  amountCents: number;
}): NotificationContent {
  return {
    type: 'RECURRING_CHARGE',
    title: 'Your monthly gift was processed',
    body: `Your recurring ${eur(input.amountCents)} contribution toward ${input.studentName} was charged. Thank you for sponsoring their journey.`,
  };
}
