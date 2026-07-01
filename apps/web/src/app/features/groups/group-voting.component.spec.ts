import { TestBed } from '@angular/core/testing';
import { GroupVoteView } from '../../core/models';
import { GroupVotingComponent } from './group-voting.component';

function vote(overrides: Partial<GroupVoteView> = {}): GroupVoteView {
  return {
    id: 'v1',
    question: 'Who do we back next?',
    status: 'OPEN',
    options: [
      { id: 'o1', label: 'Amara', campaignId: 'c1', count: 3 },
      { id: 'o2', label: 'Ben', campaignId: 'c2', count: 1 },
    ],
    totalVotes: 4,
    winnerId: 'o1',
    decided: true,
    ...overrides,
  };
}

describe('GroupVotingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupVotingComponent],
    }).compileComponents();
  });

  function render(v: GroupVoteView, canVote = false) {
    const fixture = TestBed.createComponent(GroupVotingComponent);
    fixture.componentRef.setInput('view', v);
    fixture.componentRef.setInput('canVote', canVote);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the question, options and leader', () => {
    const el = render(vote()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Who do we back next?');
    expect(el.textContent).toContain('Amara');
    expect(el.textContent).toContain('leading: Amara');
    expect(el.textContent).toContain('4 votes');
  });

  it('hides vote buttons when the viewer cannot vote', () => {
    const fixture = render(vote(), false);
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('shows a vote button per option and emits the option id', () => {
    const fixture = render(vote(), true);
    let emitted: string | undefined;
    fixture.componentInstance.vote.subscribe((id) => (emitted = id));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(2);
    (buttons[0] as HTMLButtonElement).click();
    expect(emitted).toBe('o1');
  });

  it('reflects a closed vote in the status', () => {
    const el = render(vote({ status: 'CLOSED' })).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Closed');
  });
});
