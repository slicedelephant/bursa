import { TestBed } from '@angular/core/testing';
import { CumulativeStats, PeerComparison } from '../../core/models';
import { PortfolioStatsComponent } from './portfolio-stats.component';

describe('PortfolioStatsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioStatsComponent],
    }).compileComponents();
  });

  function render(stats: CumulativeStats, peer: PeerComparison) {
    const fixture = TestBed.createComponent(PortfolioStatsComponent);
    fixture.componentRef.setInput('stats', stats);
    fixture.componentRef.setInput('peer', peer);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the cumulative stat tiles and peer comparison', () => {
    const el = render(
      {
        totalCents: 53000,
        contributionCount: 9,
        distinctTargets: 5,
        impactPerTargetCents: 10600,
        firstMonth: '2025-12',
        lastMonth: '2026-06',
      },
      { yourValue: 5, peerAverage: 2.4, ratio: 2.08, ahead: true },
    );
    expect(el.textContent).toContain('Total given');
    expect(el.textContent).toContain('Students supported');
    expect(el.textContent).toContain('Impact per student');
    expect(el.textContent).toContain('you’re ahead!');
  });
});
