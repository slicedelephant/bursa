import { NotificationType } from '../../core/models';

/** Pure presentation mapping for a notification type. No I/O. */
export interface NotificationStyle {
  readonly icon: string;
  readonly accent: string;
  readonly label: string;
}

const STYLES: Record<NotificationType, NotificationStyle> = {
  THANK_YOU: { icon: '💚', accent: 'bg-brand-green/10 text-brand-green', label: 'Thank you' },
  MILESTONE: { icon: '📈', accent: 'bg-brand-blue/10 text-brand-blue', label: 'Milestone' },
  GOAL_REACHED: { icon: '🎉', accent: 'bg-brand-green/10 text-brand-green', label: 'Goal reached' },
  IMPACT_UPDATE: { icon: '📣', accent: 'bg-brand-blue/10 text-brand-blue', label: 'Update' },
  RECURRING_CHARGE: { icon: '🔁', accent: 'bg-slate-100 text-slate2', label: 'Monthly gift' },
};

const FALLBACK: NotificationStyle = {
  icon: '🔔',
  accent: 'bg-slate-100 text-slate2',
  label: 'Notification',
};

export function notificationStyle(type: NotificationType): NotificationStyle {
  return STYLES[type] ?? FALLBACK;
}
