import { TestBed } from '@angular/core/testing';
import { FeedView } from '../../core/models';
import { ImpactFeedComponent } from './impact-feed.component';

function view(partial: Partial<FeedView> = {}): FeedView {
  return {
    items: [],
    unreadCount: 0,
    readStreak: {
      currentMonths: 0,
      longestMonths: 0,
      currentMonthCovered: false,
      lastActiveMonth: null,
    },
    ...partial,
  };
}

describe('ImpactFeedComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImpactFeedComponent],
    }).compileComponents();
  });

  function render(v: FeedView) {
    const fixture = TestBed.createComponent(ImpactFeedComponent);
    fixture.componentRef.setInput('view', v);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an empty state when there are no items', () => {
    const el = render(view()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No updates yet');
  });

  it('renders story cards with the unread badge and streak', () => {
    const el = render(
      view({
        unreadCount: 1,
        readStreak: {
          currentMonths: 3,
          longestMonths: 3,
          currentMonthCovered: true,
          lastActiveMonth: '2026-06',
        },
        items: [
          {
            key: 'voice:m1',
            kind: 'STUDENT_VOICE',
            campaignId: 'c1',
            title: 'A thank-you from Amara',
            body: 'Thank you!',
            ctaUrl: '/campaigns/c1',
            photoUrl: 'https://x/amara.jpg',
            videoUrl: 'https://x/t.mp4',
            voiceUrl: null,
            createdAt: new Date().toISOString(),
            read: false,
          },
        ],
      }),
    ).nativeElement as HTMLElement;

    expect(el.textContent).toContain('1 new');
    expect(el.textContent).toContain('3 months of staying in touch');
    expect(el.textContent).toContain('A thank-you from Amara');
    expect(el.textContent).toContain('media');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://x/amara.jpg');
  });

  it('emits the item key when "Mark as read" is clicked', () => {
    const fixture = render(
      view({
        unreadCount: 1,
        items: [
          {
            key: 'update:u1',
            kind: 'IMPACT_UPDATE',
            campaignId: 'c1',
            title: 'Exams passed',
            body: 'Distinction',
            ctaUrl: '/campaigns/c1',
            photoUrl: null,
            createdAt: new Date().toISOString(),
            read: false,
          },
        ],
      }),
    );
    let emitted: string | undefined;
    fixture.componentInstance.read.subscribe((k) => (emitted = k));

    const btn = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe('update:u1');
  });

  it('marks an already-read card as Read', () => {
    const el = render(
      view({
        items: [
          {
            key: 'update:u2',
            kind: 'IMPACT_UPDATE',
            campaignId: 'c1',
            title: 'Old update',
            body: 'b',
            ctaUrl: '/campaigns/c1',
            photoUrl: null,
            createdAt: new Date().toISOString(),
            read: true,
          },
        ],
      }),
    ).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Read');
  });
});
