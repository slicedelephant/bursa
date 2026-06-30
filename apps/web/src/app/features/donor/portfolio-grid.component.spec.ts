import { TestBed } from '@angular/core/testing';
import { PortfolioItem } from '../../core/models';
import { PortfolioGridComponent } from './portfolio-grid.component';

const item = (over: Partial<PortfolioItem> = {}): PortfolioItem => ({
  campaignId: 'c1',
  studentName: 'Amara Okonkwo',
  photoUrl: '/seed/amara.png',
  country: 'Nigeria',
  schoolName: 'ESMT Berlin',
  campaignTitle: 'Help Amara',
  raisedCents: 1840000,
  goalCents: 4500000,
  percent: 41,
  verified: true,
  yourContributionCents: 45000,
  canDonateAgain: true,
  ...over,
});

describe('PortfolioGridComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioGridComponent],
    }).compileComponents();
  });

  function render(items: PortfolioItem[]) {
    const fixture = TestBed.createComponent(PortfolioGridComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a card per supported student with progress and a verified badge', () => {
    const el = render([item()]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Amara Okonkwo');
    expect(el.textContent).toContain('ESMT Berlin');
    expect(el.textContent).toContain('41%');
    expect(el.textContent).toContain('Verified');
  });

  it('shows an empty state when there are no students', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No students in your portfolio yet');
  });

  it('emits donateAgain with the campaign id when the campaign is live', () => {
    const fixture = render([item({ canDonateAgain: true })]);
    let emitted: string | undefined;
    fixture.componentInstance.donateAgain.subscribe((id) => (emitted = id));
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    btn?.dispatchEvent(new Event('click'));
    expect(emitted).toBe('c1');
  });

  it('does not offer donate-again for a campaign that is no longer live', () => {
    const el = render([item({ canDonateAgain: false })]).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Donate again');
  });

  it('omits the verified badge for an unverified campaign', () => {
    const el = render([item({ verified: false })]).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Verified');
  });

  it('shows an initial avatar when the student has no photo', () => {
    const fixture = render([item({ photoUrl: null, studentName: 'Zola Dube' })]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('Z');
    expect(fixture.componentInstance.initial(item({ studentName: 'amara' }))).toBe('A');
  });
});
