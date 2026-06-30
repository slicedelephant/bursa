import { TestBed } from '@angular/core/testing';
import { InactivityView } from '../../core/models';
import { InactivityReminderComponent } from './inactivity-reminder.component';

describe('InactivityReminderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InactivityReminderComponent],
    }).compileComponents();
  });

  function render(v: InactivityView) {
    const fixture = TestBed.createComponent(InactivityReminderComponent);
    fixture.componentRef.setInput('view', v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the reminder with a donate CTA when due', () => {
    const el = render({
      inactive: true,
      daysSince: 95,
      shouldRemind: true,
      reminder: {
        title: 'Your students miss you',
        body: 'Amara has new milestones.',
        ctaUrl: '/campaigns/c1?ref=reminder',
      },
    });
    expect(el.textContent).toContain('Your students miss you');
    expect(el.textContent).toContain('Amara has new milestones');
    expect(el.textContent).toContain('Your last gift was 95 days ago');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/campaigns/c1?ref=reminder');
  });

  it('renders nothing when no reminder is due', () => {
    const el = render({ inactive: false, daysSince: 10, shouldRemind: false });
    expect(el.textContent?.trim()).toBe('');
    expect(el.querySelector('a')).toBeNull();
  });

  it('falls back to safe values when the reminder payload is missing', () => {
    const fixture = TestBed.createComponent(InactivityReminderComponent);
    fixture.componentRef.setInput('view', {
      inactive: true,
      daysSince: 100,
      shouldRemind: true,
    } as InactivityView);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect(cmp.show()).toBe(false);
    expect(cmp.reminderBody()).toBe('');
    expect(cmp.ctaUrl()).toBe('#');
  });
});
