import {
  impactUpdateNotification,
  milestoneNotification,
  recurringChargeNotification,
  thankYouNotification,
} from './notification-templates';

describe('notification templates', () => {
  it('builds a thank-you with a formatted amount', () => {
    const n = thankYouNotification({ studentName: 'Amara', amountCents: 5000 });
    expect(n.type).toBe('THANK_YOU');
    expect(n.body).toContain('€50');
    expect(n.body).toContain('Amara');
  });

  it('formats thousands in the thank-you amount', () => {
    const n = thankYouNotification({ studentName: 'Amara', amountCents: 1500000 });
    expect(n.body).toContain('€15,000');
  });

  it('builds a sub-100 milestone as MILESTONE', () => {
    const n = milestoneNotification({ percent: 80, studentName: 'Kwame' });
    expect(n.type).toBe('MILESTONE');
    expect(n.title).toContain('80%');
  });

  it('builds the 100% milestone as GOAL_REACHED', () => {
    const n = milestoneNotification({ percent: 100, studentName: 'Kwame' });
    expect(n.type).toBe('GOAL_REACHED');
    expect(n.title).toContain('reached its goal');
  });

  it('builds an impact-update notification', () => {
    const n = impactUpdateNotification({
      studentName: 'Thandiwe',
      updateTitle: 'Semester 1 started',
    });
    expect(n.type).toBe('IMPACT_UPDATE');
    expect(n.title).toContain('Thandiwe');
    expect(n.title).toContain('Semester 1 started');
  });

  it('builds a recurring-charge notification', () => {
    const n = recurringChargeNotification({ studentName: 'Amara', amountCents: 2500 });
    expect(n.type).toBe('RECURRING_CHARGE');
    expect(n.body).toContain('€25');
  });
});
