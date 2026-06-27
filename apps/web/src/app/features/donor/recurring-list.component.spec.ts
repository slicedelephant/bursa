import { TestBed } from '@angular/core/testing';
import { RecurringPledge } from '../../core/models';
import { RecurringListComponent } from './recurring-list.component';

describe('RecurringListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringListComponent],
    }).compileComponents();
  });

  function render(pledges: RecurringPledge[]) {
    const fixture = TestBed.createComponent(RecurringListComponent);
    fixture.componentRef.setInput('pledges', pledges);
    fixture.detectChanges();
    return fixture;
  }

  const pledge = (over: Partial<RecurringPledge> = {}): RecurringPledge => ({
    id: 'r1',
    campaignId: 'c1',
    amountCents: 2500,
    currency: 'EUR',
    status: 'ACTIVE',
    chargesCount: 2,
    totalChargedCents: 5000,
    nextRunAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    campaign: { title: 'Help Amara study' },
    ...over,
  });

  it('renders an active pledge with pause/cancel and a run button', () => {
    const fixture = render([pledge()]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Help Amara study');
    expect(el.textContent).toContain('Simulate next charge');
    expect(el.textContent).toContain('Pause');
    expect(el.textContent).toContain('Cancel');
    expect(el.textContent).not.toContain('Resume');
  });

  it('shows Resume for a paused pledge and hides the run button when none active', () => {
    const el = render([pledge({ status: 'PAUSED' })]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Resume');
    expect(el.textContent).not.toContain('Simulate next charge');
  });

  it('hides all controls except status for a cancelled pledge', () => {
    const el = render([pledge({ status: 'CANCELLED' })]).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Pause');
    expect(el.textContent).not.toContain('Resume');
    expect(el.textContent).not.toContain('Cancel');
  });

  it('emits lifecycle events', () => {
    const fixture = render([pledge()]);
    const events: string[] = [];
    fixture.componentInstance.pause.subscribe((id) => events.push('pause:' + id));
    fixture.componentInstance.cancel.subscribe((id) => events.push('cancel:' + id));
    let ran = false;
    fixture.componentInstance.run.subscribe(() => (ran = true));

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.forEach((b) => b.dispatchEvent(new Event('click')));

    expect(ran).toBe(true);
    expect(events).toContain('pause:r1');
    expect(events).toContain('cancel:r1');
  });

  it('shows an empty state', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('no monthly gifts yet');
  });
});
