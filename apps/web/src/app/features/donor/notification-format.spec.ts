import { NotificationType } from '../../core/models';
import { notificationStyle } from './notification-format';

describe('notificationStyle', () => {
  it('maps each known type to an icon and label', () => {
    expect(notificationStyle('THANK_YOU').label).toBe('Thank you');
    expect(notificationStyle('MILESTONE').label).toBe('Milestone');
    expect(notificationStyle('GOAL_REACHED').icon).toBe('🎉');
    expect(notificationStyle('IMPACT_UPDATE').label).toBe('Update');
    expect(notificationStyle('RECURRING_CHARGE').label).toBe('Monthly gift');
  });

  it('falls back for an unknown type', () => {
    const s = notificationStyle('SOMETHING' as NotificationType);
    expect(s.label).toBe('Notification');
    expect(s.icon).toBe('🔔');
  });
});
