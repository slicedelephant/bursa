import { TestBed } from '@angular/core/testing';
import { ApplicationRow } from '../../core/models';
import { ReviewerConsoleComponent, ScoreSubmission } from './reviewer-console.component';

function application(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: 'app1',
    applicantName: 'Amara Okonkwo',
    applicantEmail: 'a@b.co',
    status: 'UNDER_REVIEW',
    consensusScore: 60,
    answerCount: 3,
    scoreCount: 1,
    awarded: false,
    ...overrides,
  };
}

describe('ReviewerConsoleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewerConsoleComponent],
    }).compileComponents();
  });

  function render(app: ApplicationRow, fields = [{ fieldKey: 'why', label: 'Why' }]) {
    const fixture = TestBed.createComponent(ReviewerConsoleComponent);
    fixture.componentRef.setInput('application', app);
    fixture.componentRef.setInput('rubricFields', fields);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the applicant and current consensus', () => {
    const el = render(application()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Amara Okonkwo');
    expect(el.textContent).toContain('Consensus so far: 60/100');
  });

  it('shows a message when there are no scored fields', () => {
    const el = render(application(), []).nativeElement as HTMLElement;
    expect(el.textContent).toContain('no scored fields');
  });

  it('emits the entered scores on submit', () => {
    const fixture = render(application());
    const submissions: ScoreSubmission[] = [];
    fixture.componentInstance.scored.subscribe((s) => submissions.push(s));
    fixture.componentInstance.values['why'] = 4;
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(submissions[0]).toEqual({
      applicationId: 'app1',
      scores: [{ fieldKey: 'why', score: 4 }],
    });
  });

  it('defaults an unscored field to zero', () => {
    const fixture = render(application());
    const submissions: ScoreSubmission[] = [];
    fixture.componentInstance.scored.subscribe((s) => submissions.push(s));
    fixture.componentInstance.submit();
    expect(submissions[0].scores[0].score).toBe(0);
  });
});
