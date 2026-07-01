import { TestBed } from '@angular/core/testing';
import { ScholarRow } from '../../core/models';
import { SrmDashboardComponent } from './srm-dashboard.component';

function scholar(overrides: Partial<ScholarRow> = {}): ScholarRow {
  return {
    id: 'scl1',
    fullName: 'Amara Okonkwo',
    status: 'AWARDED',
    alumniNetwork: false,
    gpa: 3.8,
    amountCents: 2000000,
    trancheStatus: 'HELD',
    ...overrides,
  };
}

describe('SrmDashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SrmDashboardComponent],
    }).compileComponents();
  });

  function render(scholars: ScholarRow[]) {
    const fixture = TestBed.createComponent(SrmDashboardComponent);
    fixture.componentRef.setInput('scholars', scholars);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an empty state with no scholars', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No scholars yet');
  });

  it('renders a scholar row with status + amount', () => {
    const el = render([scholar()]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Amara Okonkwo');
    expect(el.textContent).toContain('Awarded');
  });

  it('emits an advance event for the next lifecycle step', () => {
    const fixture = render([scholar({ status: 'AWARDED' })]);
    const events: { scholarId: string; event: string }[] = [];
    fixture.componentInstance.advance.subscribe((e) => events.push(e));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    expect(events[0]).toEqual({ scholarId: 'scl1', event: 'enroll' });
  });

  it('hides the advance button for a terminal scholar', () => {
    const fixture = render([scholar({ status: 'WITHDRAWN' })]);
    const el = fixture.nativeElement as HTMLElement;
    // Only the "Message" button remains.
    expect(el.querySelectorAll('button')).toHaveLength(1);
    expect(el.textContent).toContain('Message');
  });

  it('emits a message event with the scholar id', () => {
    const fixture = render([scholar()]);
    const ids: string[] = [];
    fixture.componentInstance.message.subscribe((id) => ids.push(id));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[buttons.length - 1] as HTMLButtonElement).click();
    expect(ids).toEqual(['scl1']);
  });

  it('flags alumni scholars', () => {
    const el = render([scholar({ status: 'GRADUATED', alumniNetwork: true })])
      .nativeElement as HTMLElement;
    expect(el.textContent).toContain('alumni');
  });
});
