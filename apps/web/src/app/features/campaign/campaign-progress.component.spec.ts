import { TestBed } from '@angular/core/testing';
import { CampaignProgressComponent } from './campaign-progress.component';

describe('CampaignProgressComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignProgressComponent],
    }).compileComponents();
  });

  function render(inputs: {
    raisedCents: number;
    goalCents: number;
    status: string;
    deadline?: string | null;
  }): HTMLElement {
    const fixture = TestBed.createComponent(CampaignProgressComponent);
    fixture.componentRef.setInput('raisedCents', inputs.raisedCents);
    fixture.componentRef.setInput('goalCents', inputs.goalCents);
    fixture.componentRef.setInput('status', inputs.status);
    if (inputs.deadline !== undefined) {
      fixture.componentRef.setInput('deadline', inputs.deadline);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('always communicates the All-or-Nothing charge promise', () => {
    const el = render({ raisedCents: 2000, goalCents: 10000, status: 'LIVE' });
    expect(el.textContent).toContain('only charged when the full tuition goal is reached');
  });

  it('shows the remaining amount while under the goal', () => {
    const el = render({ raisedCents: 200000, goalCents: 1000000, status: 'LIVE' });
    expect(el.textContent).toContain('still to go');
  });

  it('shows the 80% milestone push', () => {
    const el = render({ raisedCents: 8500, goalCents: 10000, status: 'LIVE' });
    expect(el.textContent).toContain('80%');
  });

  it('shows the 90% final push', () => {
    const el = render({ raisedCents: 9500, goalCents: 10000, status: 'LIVE' });
    expect(el.textContent).toContain('90%');
  });

  it('shows a funded message and no remaining once the goal is reached', () => {
    const el = render({ raisedCents: 10000, goalCents: 10000, status: 'FUNDED' });
    expect(el.textContent).toContain('Goal reached');
    expect(el.textContent).not.toContain('still to go');
  });

  it('renders an urgent countdown for a near deadline', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const el = render({ raisedCents: 2000, goalCents: 10000, status: 'LIVE', deadline: soon });
    expect(el.textContent).toContain('left until studies begin');
  });

  it('reports a passed deadline', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const el = render({ raisedCents: 2000, goalCents: 10000, status: 'LIVE', deadline: past });
    expect(el.textContent).toContain('deadline has passed');
  });
});
