import { TestBed } from '@angular/core/testing';
import { ApplicationRow } from '../../core/models';
import { AwardManagementComponent } from './award-management.component';

function app(id: string, score: number, awarded = false): ApplicationRow {
  return {
    id,
    applicantName: `Applicant ${id}`,
    applicantEmail: `${id}@b.co`,
    status: awarded ? 'AWARDED' : 'UNDER_REVIEW',
    consensusScore: score,
    answerCount: 3,
    scoreCount: 1,
    awarded,
  };
}

describe('AwardManagementComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AwardManagementComponent],
    }).compileComponents();
  });

  function render(applications: ApplicationRow[]) {
    const fixture = TestBed.createComponent(AwardManagementComponent);
    fixture.componentRef.setInput('applications', applications);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an empty state with no applications', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No applications yet');
  });

  it('ranks applications by consensus score descending', () => {
    const fixture = render([app('a', 70), app('b', 95), app('c', 80)]);
    const ranked = fixture.componentInstance.ranked();
    expect(ranked.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the applications input while ranking', () => {
    const applications = [app('a', 70), app('b', 95)];
    const fixture = render(applications);
    fixture.componentInstance.ranked();
    expect(applications.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('emits a decide event', () => {
    const fixture = render([app('a', 70)]);
    let decided = false;
    fixture.componentInstance.decide.subscribe(() => (decided = true));
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(decided).toBe(true);
  });

  it('marks awarded applications', () => {
    const el = render([app('a', 90, true)]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Awarded');
  });

  it('reminds that money goes to the school', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('never to the scholar');
  });
});
