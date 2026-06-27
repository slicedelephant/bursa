import { TestBed } from '@angular/core/testing';
import { EsgDashboard } from '../../core/models';
import { EsgDashboardComponent } from './esg-dashboard.component';

const dashboard = (over: Partial<EsgDashboard> = {}): EsgDashboard => ({
  companyName: 'Acme Capital',
  metrics: {
    studentsSupported: 3,
    countriesReached: 2,
    schoolsSupported: 2,
    totalCommittedCents: 4_200_000,
    fullScholarships: 1,
    namedScholarships: 1,
  },
  rows: [
    {
      campaignTitle: 'Help Amara',
      studentName: 'Amara',
      studentCountry: 'Nigeria',
      schoolName: 'INSEAD',
      amountCents: 4_200_000,
      tier: 'FULL',
      scholarshipName: 'The Acme Scholarship',
      fullTuition: true,
      recognitionKind: 'NAMED',
      createdAt: '2026-06-01',
    },
  ],
  ...over,
});

describe('EsgDashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EsgDashboardComponent],
    }).compileComponents();
  });

  function render(d: EsgDashboard) {
    const fixture = TestBed.createComponent(EsgDashboardComponent);
    fixture.componentRef.setInput('dashboard', d);
    fixture.detectChanges();
    return fixture;
  }

  it('renders all six metric tiles with a formatted money total', () => {
    const el = render(dashboard()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Students supported');
    expect(el.textContent).toContain('Total committed');
    expect(el.textContent).toContain('€42,000');
    expect(el.textContent).toContain('Named scholarships');
  });

  it('emits export events', () => {
    const fixture = render(dashboard());
    const events: string[] = [];
    fixture.componentInstance.exportCsv.subscribe(() => events.push('csv'));
    fixture.componentInstance.exportPdf.subscribe(() => events.push('pdf'));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    expect(events).toEqual(['csv', 'pdf']);
  });

  it('shows an empty hint when there are no sponsorships', () => {
    const el = render(dashboard({ rows: [] })).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No corporate sponsorships yet');
  });
});
